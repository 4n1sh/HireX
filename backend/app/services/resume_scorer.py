# app/services/resume_scorer.py

import re
import io
import json
import numpy as np
import pdfplumber
import docx
import httpx

OLLAMA_BASE_URL = "http://localhost:11434"
EXTRACT_MODEL   = "phi3"
EMBED_MODEL     = "nomic-embed-text"

SECTION_WEIGHTS = {
    "skills":     0.40,
    "experience": 0.35,
    "education":  0.15,
    "summary":    0.10,
}

RESUME_EXTRACTION_PROMPT = """\
You are a resume parser. Extract information from the resume below and return ONLY a valid JSON object with no explanation, no markdown, no code fences.

Return exactly this structure:
{{
  "summary": "candidate objective or profile summary, or infer one from overall profile",
  "skills": "all technical skills, tools, languages, frameworks, soft skills as a comma-separated string",
  "experience": "all work experience: role, company, duration, key responsibilities as one string",
  "education": "all education: degree, institution, graduation year as one string"
}}

Rules:
- Return ONLY the JSON. No text before or after.
- If a section is missing, use empty string "".
- Combine multiple entries into one string per key.

Resume text:
{resume_text}
"""

JOB_EXTRACTION_PROMPT = """\
You are a job requirements parser. Extract information from the job posting below and return ONLY a valid JSON object with no explanation, no markdown, no code fences.

Return exactly this structure:
{{
  "summary": "brief summary of the role and its purpose",
  "skills": "all required and preferred skills, tools, languages, frameworks as a comma-separated string",
  "experience": "required experience level, years of experience, and key responsibilities expected",
  "education": "required education or qualifications, or empty string if not specified"
}}

Rules:
- Return ONLY the JSON. No text before or after.
- If a section is missing, use empty string "".

Job posting:
Title: {title}
Experience Level: {experience_level}
Description: {description}
"""


# ─────────────────────────────────────────
# STEP 1 — RAW TEXT EXTRACTION
# ─────────────────────────────────────────

def extract_raw_text(file_bytes: bytes, filename: str) -> str:
    ext = filename.lower().rsplit(".", 1)[-1]

    if ext == "pdf":
        parts = []
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                t = page.extract_text(layout=True)
                if t:
                    parts.append(t)
        return "\n".join(parts)

    elif ext in ("doc", "docx"):
        document = docx.Document(io.BytesIO(file_bytes))
        return "\n".join(p.text for p in document.paragraphs if p.text.strip())

    raise ValueError(f"Unsupported file type: .{ext}")


# ─────────────────────────────────────────
# STEP 2 — LLM EXTRACTION (phi3, sync)
# ─────────────────────────────────────────

def _parse_llm_json(raw: str) -> dict:
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip())
    cleaned = re.sub(r"\s*```$", "", cleaned).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
    return {"summary": "", "skills": "", "experience": "", "education": ""}


def _ollama_generate(prompt: str) -> str:
    with httpx.Client(timeout=120.0) as client:
        resp = client.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={
                "model": EXTRACT_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": 0, "num_predict": 1024},
            },
        )
        resp.raise_for_status()
        return resp.json()["response"]


def extract_resume_sections(raw_text: str) -> dict:
    prompt = RESUME_EXTRACTION_PROMPT.format(resume_text=raw_text[:6000])
    response = _ollama_generate(prompt)
    sections = _parse_llm_json(response)
    for key in SECTION_WEIGHTS:
        sections.setdefault(key, "")
    return sections


def extract_job_sections(title: str, experience_level: str, description: str) -> dict:
    prompt = JOB_EXTRACTION_PROMPT.format(
        title=title,
        experience_level=experience_level or "",
        description=description[:4000],
    )
    response = _ollama_generate(prompt)
    sections = _parse_llm_json(response)
    for key in SECTION_WEIGHTS:
        sections.setdefault(key, "")
    return sections


# ─────────────────────────────────────────
# STEP 3 — EMBED (nomic-embed-text, sync)
# ─────────────────────────────────────────

def _embed_one(text: str) -> list:
    if not text.strip():
        return []
    with httpx.Client(timeout=30.0) as client:
        resp = client.post(
            f"{OLLAMA_BASE_URL}/api/embeddings",
            json={"model": EMBED_MODEL, "prompt": text},
        )
        resp.raise_for_status()
        return resp.json()["embedding"]


def embed_sections(sections: dict) -> dict:
    embeddings = {}
    for section, text in sections.items():
        try:
            embeddings[section] = _embed_one(text)
        except Exception as e:
            print(f"[Embed Error] section={section}: {e}")
            embeddings[section] = []
    return embeddings


# ─────────────────────────────────────────
# STEP 4 — WEIGHTED COSINE SCORE
# ─────────────────────────────────────────

def _cosine_similarity(a: list, b: list) -> float:
    if not a or not b:
        return 0.0
    va, vb = np.array(a), np.array(b)
    denom = np.linalg.norm(va) * np.linalg.norm(vb)
    return float(np.dot(va, vb) / denom) if denom > 0 else 0.0


def compute_weighted_score(resume_embeddings: dict, job_embeddings: dict) -> tuple:
    weighted_sum  = 0.0
    total_weight  = 0.0
    breakdown     = {}

    for section, weight in SECTION_WEIGHTS.items():
        r_emb = resume_embeddings.get(section, [])
        j_emb = job_embeddings.get(section, [])

        if r_emb and j_emb:
            sim   = _cosine_similarity(r_emb, j_emb)
            score = round(((sim + 1) / 2) * 100, 1)   # normalize -1..1 → 0..100
        else:
            score = 0.0

        breakdown[section] = score
        weighted_sum      += weight * score
        total_weight      += weight

    final = round(weighted_sum / total_weight, 1) if total_weight > 0 else 0.0
    return final, breakdown


# ─────────────────────────────────────────
# MAIN ENTRY POINT
# ─────────────────────────────────────────

def score_resume_against_job(
    file_bytes: bytes,
    filename: str,
    job_title: str,
    job_experience_level: str,
    job_description: str,
    cached_job_sections: dict | None = None,
) -> dict:
    """
    Full pipeline — called from BackgroundTasks.

    Returns:
        similarity_score  float 0–100
        breakdown         per-section scores dict
        resume_extracted  dict  → save to applications.extracted_data
        job_extracted     dict  → save to job_postings.extracted_requirements
    """
    # 1. Raw text
    raw_text = extract_raw_text(file_bytes, filename)

    # 2. Section extraction
    resume_sections = extract_resume_sections(raw_text)
    job_sections    = cached_job_sections or extract_job_sections(
        job_title, job_experience_level, job_description
    )

    # 3. Embed
    resume_embeddings = embed_sections(resume_sections)
    job_embeddings    = embed_sections(job_sections)

    # 4. Score
    final_score, breakdown = compute_weighted_score(resume_embeddings, job_embeddings)

    return {
        "similarity_score": final_score,
        "breakdown":        breakdown,
        "resume_extracted": resume_sections,
        "job_extracted":    job_sections,
    }