# app/services/resume_scorer.py

import re
import io
import json
import numpy as np
import pdfplumber
import docx
import httpx
from concurrent.futures import ThreadPoolExecutor

OLLAMA_BASE_URL = "http://localhost:11434"
EXTRACT_MODEL   = "phi3"
EMBED_MODEL     = "nomic-embed-text"

# Category weights — must sum to 1.0
SECTION_WEIGHTS = {
    "skills":     0.6,
    "experience": 0.3,
    "education":  0.1,
}

# How much LLM score contributes vs embedding per category
BLEND_RATIOS = {
    "skills":     0.5,
    "experience": 0.3,
    "education":  0.2,
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

_LLM_SCORE_PROMPT = """\
You are an expert recruiter evaluating candidate fit.

Score how well the candidate's {category} matches the job requirement on a scale of 0.0 to 1.0.

Job {category}:
{job_text}

Candidate {category}:
{candidate_text}

Reply in exactly this format (no other text):
SCORE: 0.7
REASON: Brief one-line explanation of the match quality.
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
# STEP 2 — LLM EXTRACTION (phi3)
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


def _normalize_sections(sections: dict) -> dict:
    """Ensure every section value is a flat string."""
    for key in ("skills", "experience", "education", "summary"):
        sections[key] = _to_str(sections.get(key, ""))
    return sections


def extract_resume_sections(raw_text: str) -> dict:
    prompt = RESUME_EXTRACTION_PROMPT.format(resume_text=raw_text[:6000])
    sections = _parse_llm_json(_ollama_generate(prompt))
    return _normalize_sections(sections)


def extract_job_sections(title: str, experience_level: str, description: str) -> dict:
    prompt = JOB_EXTRACTION_PROMPT.format(
        title=title,
        experience_level=experience_level or "",
        description=description[:4000],
    )
    sections = _parse_llm_json(_ollama_generate(prompt))
    return _normalize_sections(sections)


# ─────────────────────────────────────────
# STEP 3 — EMBEDDINGS (nomic-embed-text)
# Batch via /api/embed — one HTTP call for N texts
# ─────────────────────────────────────────

def _to_str(val) -> str:
    """Coerce any value to a flat string (LLM may return dicts/lists instead of strings)."""
    if isinstance(val, str):
        return val
    if isinstance(val, dict):
        return ", ".join(f"{k}: {v}" for k, v in val.items() if v)
    if isinstance(val, list):
        return ", ".join(str(item) for item in val)
    return str(val) if val else ""


def _embed_batch(texts: list) -> list:
    """
    Embed a list of texts in one HTTP call using Ollama /api/embed.
    Returns a list of embeddings in the same order; empty list for blank inputs.
    """
    texts = [_to_str(t) for t in texts]
    indexed = [(i, t) for i, t in enumerate(texts) if t.strip()]
    result = [[] for _ in texts]

    if not indexed:
        return result

    inputs = [t for _, t in indexed]
    with httpx.Client(timeout=60.0) as client:
        resp = client.post(
            f"{OLLAMA_BASE_URL}/api/embed",
            json={"model": EMBED_MODEL, "input": inputs},
        )
        resp.raise_for_status()
        embs = resp.json()["embeddings"]

    for (orig_i, _), emb in zip(indexed, embs):
        result[orig_i] = emb

    return result


def _cosine_similarity(a: list, b: list) -> float:
    if not a or not b:
        return 0.0
    va, vb = np.array(a), np.array(b)
    denom = np.linalg.norm(va) * np.linalg.norm(vb)
    return float(np.dot(va, vb) / denom) if denom > 0 else 0.0


def _split_skills(skills_text: str) -> list:
    return [s.strip() for s in skills_text.split(",") if s.strip()]


def _embedding_score_skills(resume_skills_text: str, job_skills_text: str) -> float:
    """
    Batch-embeds all individual skills in one call.
    Computes best-match-per-job-skill then averages.
    Returns 0..1.
    """
    job_skills    = _split_skills(job_skills_text)
    resume_skills = _split_skills(resume_skills_text)

    if not job_skills or not resume_skills:
        embs = _embed_batch([resume_skills_text, job_skills_text])
        return (_cosine_similarity(embs[0], embs[1]) + 1) / 2

    all_skills = job_skills + resume_skills
    try:
        all_embs = _embed_batch(all_skills)
    except Exception as exc:
        print(f"[Skills Embed Error] {exc}")
        return 0.0

    n = len(job_skills)
    job_embs    = [e for e in all_embs[:n] if e]
    resume_embs = [e for e in all_embs[n:] if e]

    if not job_embs or not resume_embs:
        return 0.0

    best_matches = [
        max(_cosine_similarity(j_emb, r_emb) for r_emb in resume_embs)
        for j_emb in job_embs
    ]
    return (sum(best_matches) / len(best_matches) + 1) / 2


# ─────────────────────────────────────────
# STEP 4 — LLM SCORING (phi3, plain text)
# ─────────────────────────────────────────

def _parse_llm_score(text: str):
    """Returns (score float, reason str) or (None, None) on parse failure."""
    score_match = re.search(r"SCORE:\s*([0-9]*\.?[0-9]+)", text)
    if not score_match:
        return None, None
    try:
        score = max(0.0, min(1.0, float(score_match.group(1))))
    except ValueError:
        return None, None
    reason_match = re.search(r"REASON:\s*(.+)", text)
    return score, (reason_match.group(1).strip() if reason_match else "")


def _llm_score_category(category: str, job_text: str, candidate_text: str):
    """
    Ask phi3 to score one category.
    Returns (score 0..1, reason) or (None, None) on any failure.
    """
    if not job_text.strip() or not candidate_text.strip():
        return None, None
    prompt = _LLM_SCORE_PROMPT.format(
        category=category,
        job_text=job_text[:1000],
        candidate_text=candidate_text[:1000],
    )
    try:
        return _parse_llm_score(_ollama_generate(prompt))
    except Exception as exc:
        print(f"[LLM Score Error] category={category}: {exc}")
        return None, None


# ─────────────────────────────────────────
# STEP 5 — HYBRID BLENDED SCORE
# Embedding (batched) + LLM (parallel) run concurrently
# ─────────────────────────────────────────

def compute_hybrid_score(resume_sections: dict, job_sections: dict) -> tuple:
    """
    Concurrently fires all 3 LLM scoring calls (in threads) while
    computing batched embedding scores on the main thread.

    Returns (final_score 0-100, breakdown dict, llm_reasons dict).
    """
    # Fire LLM scoring for all categories in parallel threads
    executor = ThreadPoolExecutor(max_workers=3)
    llm_futures = {
        cat: executor.submit(
            _llm_score_category,
            cat,
            job_sections.get(cat, ""),
            resume_sections.get(cat, ""),
        )
        for cat in SECTION_WEIGHTS
    }

    # While LLM runs: compute embedding scores with batch calls
    emb_scores = {}

    # Skills — one batch call for all individual skills
    emb_scores["skills"] = _embedding_score_skills(
        resume_sections.get("skills", ""),
        job_sections.get("skills", ""),
    )

    # Experience + Education — one batch call for both
    exp_edu_texts = [
        resume_sections.get("experience", ""),
        job_sections.get("experience", ""),
        resume_sections.get("education", ""),
        job_sections.get("education", ""),
    ]
    try:
        exp_edu_embs = _embed_batch(exp_edu_texts)
        emb_scores["experience"] = (_cosine_similarity(exp_edu_embs[0], exp_edu_embs[1]) + 1) / 2
        emb_scores["education"]  = (_cosine_similarity(exp_edu_embs[2], exp_edu_embs[3]) + 1) / 2
    except Exception as exc:
        print(f"[Embed Error] experience/education: {exc}")
        emb_scores.setdefault("experience", 0.0)
        emb_scores.setdefault("education",  0.0)

    # Collect LLM results (already done or nearly done)
    executor.shutdown(wait=True)

    breakdown = {}
    llm_reasons = {}

    for category in SECTION_WEIGHTS:
        blend     = BLEND_RATIOS[category]
        emb_score = emb_scores.get(category, 0.0)
        llm_score, reason = llm_futures[category].result()

        blended = (
            emb_score
            if llm_score is None
            else (1 - blend) * emb_score + blend * llm_score
        )

        breakdown[category] = round(blended * 100, 1)
        if reason:
            llm_reasons[category] = reason

    final = sum(SECTION_WEIGHTS[c] * breakdown[c] for c in SECTION_WEIGHTS)
    return round(final, 1), breakdown, llm_reasons


# ─────────────────────────────────────────
# STEP 6 — SKILL GAP ANALYSIS
# ─────────────────────────────────────────

def analyze_skill_gap(resume_sections: dict, job_sections: dict) -> dict:
    """
    Compare JD required skills vs resume skills using embedding similarity.
    Each JD skill is classified as matched / partial / missing.
    Returns { matched: [...], partial: [...], missing: [...] }
    """
    job_skills    = _split_skills(job_sections.get("skills", ""))
    resume_skills = _split_skills(resume_sections.get("skills", ""))

    if not job_skills:
        return {"matched": [], "partial": [], "missing": []}
    if not resume_skills:
        return {"matched": [], "partial": [], "missing": job_skills}

    all_skills = job_skills + resume_skills
    try:
        all_embs = _embed_batch(all_skills)
    except Exception as exc:
        print(f"[Skill Gap Error] {exc}")
        return {"matched": [], "partial": [], "missing": job_skills}

    n           = len(job_skills)
    job_embs    = all_embs[:n]
    resume_embs = [e for e in all_embs[n:] if e]

    matched, partial, missing = [], [], []
    for skill, j_emb in zip(job_skills, job_embs):
        if not j_emb or not resume_embs:
            missing.append(skill)
            continue
        best_sim = max(_cosine_similarity(j_emb, r_emb) for r_emb in resume_embs)
        if best_sim >= 0.75:
            matched.append(skill)
        elif best_sim >= 0.55:
            partial.append(skill)
        else:
            missing.append(skill)

    return {"matched": matched, "partial": partial, "missing": missing}


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
        breakdown         per-category blended scores dict
        llm_reasons       per-category one-line LLM explanations (when available)
        resume_extracted  dict  → saved to applications.extracted_data
        job_extracted     dict  → saved to job_postings.extracted_requirements
    """
    # 1. Raw text
    raw_text = extract_raw_text(file_bytes, filename)

    # 2. Section extraction — run resume + job in parallel when both are needed
    if cached_job_sections:
        resume_sections = extract_resume_sections(raw_text)
        job_sections    = cached_job_sections
    else:
        with ThreadPoolExecutor(max_workers=2) as ex:
            resume_future = ex.submit(extract_resume_sections, raw_text)
            job_future    = ex.submit(
                extract_job_sections, job_title, job_experience_level, job_description
            )
        resume_sections = resume_future.result()
        job_sections    = job_future.result()

    # 3. Hybrid score (embedding batched + LLM parallel)
    final_score, breakdown, llm_reasons = compute_hybrid_score(resume_sections, job_sections)

    return {
        "similarity_score": final_score,
        "breakdown":        breakdown,
        "llm_reasons":      llm_reasons,
        "resume_extracted": resume_sections,
        "job_extracted":    job_sections,
    }
