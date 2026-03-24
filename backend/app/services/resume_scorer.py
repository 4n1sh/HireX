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

# ── Persistent HTTP client — reuses TCP connections across all Ollama calls ────
_http = httpx.Client(
    timeout=httpx.Timeout(connect=10.0, read=120.0, write=30.0, pool=5.0),
    limits=httpx.Limits(max_connections=8, max_keepalive_connections=4),
)

# Category weights — must sum to 1.0
SECTION_WEIGHTS = {
    "skills":     0.80,
    "experience": 0.15,
    "education":  0.05,
}

# Cosine baselines for nomic-embed-text (calibrated subtraction).
# Skills: short tech terms cluster ~0.60-0.70 even when unrelated → baseline 0.58
# Context phrases: unrelated sentences ~0.40-0.55, related ~0.60-0.85
SKILL_SIM_BASELINE   = 0.58
CONTEXT_SIM_BASELINE = 0.45

# Skill gap thresholds (raw cosine, applied AFTER string-match layer)
SKILL_GAP_MATCH   = 0.90
SKILL_GAP_PARTIAL = 0.80

# Words that describe proficiency, not the technology itself — skip in token matching
_GENERIC_TOKENS = {
    "basic", "advanced", "intermediate", "understanding", "knowledge",
    "experience", "skills", "good", "proficiency", "familiar", "strong",
    "solid", "working", "hands", "with", "and", "the", "use", "using",
}


# ─────────────────────────────────────────
# PROMPTS
# ─────────────────────────────────────────

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
    resp = _http.post(
        f"{OLLAMA_BASE_URL}/api/generate",
        json={
            "model": EXTRACT_MODEL,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": 0, "num_predict": 1024, "num_ctx": 4096},
        },
    )
    resp.raise_for_status()
    return resp.json()["response"]


def _to_str(val) -> str:
    if isinstance(val, str):
        return val
    if isinstance(val, dict):
        return ", ".join(f"{k}: {v}" for k, v in val.items() if v)
    if isinstance(val, list):
        return ", ".join(str(item) for item in val)
    return str(val) if val else ""


def _normalize_sections(sections: dict) -> dict:
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
# ─────────────────────────────────────────

def _embed_batch(texts: list) -> list:
    """
    Embed a list of texts in ONE HTTP call via Ollama /api/embed.
    Returns embeddings in the same order; empty list for blank inputs.
    """
    texts = [_to_str(t) for t in texts]
    indexed = [(i, t) for i, t in enumerate(texts) if t.strip()]
    result = [[] for _ in texts]

    if not indexed:
        return result

    resp = _http.post(
        f"{OLLAMA_BASE_URL}/api/embed",
        json={"model": EMBED_MODEL, "input": [t for _, t in indexed]},
    )
    resp.raise_for_status()
    embs = resp.json()["embeddings"]

    for (orig_i, _), emb in zip(indexed, embs):
        result[orig_i] = emb

    return result


def _cosine_similarity(a: list, b: list) -> float:
    if not a or not b:
        return 0.0
    va, vb = np.array(a, dtype=np.float32), np.array(b, dtype=np.float32)
    denom = np.linalg.norm(va) * np.linalg.norm(vb)
    return float(np.dot(va, vb) / denom) if denom > 0 else 0.0


def _calibrated_sim(cosine: float, baseline: float) -> float:
    """
    Map [baseline, 1.0] → [0.0, 1.0].
    Anything at or below baseline → 0.0 (unrelated content scores 0, not 50%).
    """
    return max(0.0, (cosine - baseline) / (1.0 - baseline))


def _split_skills(skills_text: str) -> list:
    return [s.strip() for s in skills_text.split(",") if s.strip()]



# ─────────────────────────────────────────
# STRING-MATCH HELPERS (for skill gap)
# ─────────────────────────────────────────

def _normalize_token(s: str) -> str:
    """Lowercase + strip all non-alphanumeric chars."""
    return re.sub(r"[^a-z0-9]", "", s.lower())


def _build_resume_token_set(resume_skills: list) -> set:
    """All meaningful tokens across every resume skill."""
    tokens = set()
    for skill in resume_skills:
        for word in skill.split():
            t = _normalize_token(word)
            if len(t) > 2 and t not in _GENERIC_TOKENS:
                tokens.add(t)
    return tokens


def _string_match_skill(job_skill: str, resume_tokens: set) -> bool:
    """
    True if the primary technology token of job_skill exists in resume_tokens.
    Uses the longest meaningful token as the identifier (avoids generic words).
    Examples:
      "Node.js"              → primary="nodejs"
      "JavaScript (ES6+)"    → primary="javascript"
      "Basic MVC understanding" → primary="mvc"
    """
    tokens = [
        _normalize_token(w)
        for w in job_skill.split()
        if len(_normalize_token(w)) > 2 and _normalize_token(w) not in _GENERIC_TOKENS
    ]
    if not tokens:
        return False
    primary = max(tokens, key=len)   # longest = most specific technology token
    return primary in resume_tokens


# ─────────────────────────────────────────
# CORE: UNIFIED SKILL SCORE + GAP
# Single embed call shared by both computations
# ─────────────────────────────────────────

def _compute_skill_score_and_gap(
    job_skills: list,
    resume_skills: list,
) -> tuple:
    """
    Returns (skill_score_0_to_1, gap_dict) using ONE embed call.

    skill_score: calibrated 0–1 for use in hybrid scoring
    gap_dict:    { matched, partial, missing } lists
    """
    if not job_skills:
        return 0.0, {"matched": [], "partial": [], "missing": []}
    if not resume_skills:
        return 0.0, {"matched": [], "partial": [], "missing": job_skills[:]}

    # ── Layer 1: fast string matching (no embeddings needed) ──────────────────
    resume_tokens = _build_resume_token_set(resume_skills)
    string_matched = set()   # indices of job skills already classified as matched

    for i, skill in enumerate(job_skills):
        if _string_match_skill(skill, resume_tokens):
            string_matched.add(i)

    # ── Layer 2: one embed call for ALL job + resume skills ───────────────────
    all_texts = job_skills + resume_skills
    try:
        all_embs = _embed_batch(all_texts)
    except Exception as exc:
        print(f"[Skills Embed Error] {exc}")
        # Fallback: string-matched → matched, rest → missing
        gap_matched  = [job_skills[i] for i in range(len(job_skills)) if i in string_matched]
        gap_missing  = [job_skills[i] for i in range(len(job_skills)) if i not in string_matched]
        score = len(string_matched) / len(job_skills) if job_skills else 0.0
        return score, {"matched": gap_matched, "partial": [], "missing": gap_missing}

    n = len(job_skills)
    job_embs    = all_embs[:n]
    resume_embs = [e for e in all_embs[n:] if e]

    # ── Scoring: string-matched → 1.0; rest → calibrated cosine ──────────────
    scored_sims = []
    for i in range(len(job_skills)):
        if i in string_matched:
            scored_sims.append(1.0)
        else:
            j_emb = job_embs[i]
            if j_emb and resume_embs:
                best = max(_cosine_similarity(j_emb, r) for r in resume_embs)
                scored_sims.append(best)

    if scored_sims:
        avg_cosine  = sum(scored_sims) / len(scored_sims)
        skill_score = _calibrated_sim(avg_cosine, SKILL_SIM_BASELINE)
    else:
        skill_score = 0.0

    # ── Gap classification ─────────────────────────────────────────────────────
    gap_matched, gap_partial, gap_missing = [], [], []

    for i, skill in enumerate(job_skills):
        if i in string_matched:
            gap_matched.append(skill)
            continue
        j_emb = job_embs[i]
        if not j_emb or not resume_embs:
            gap_missing.append(skill)
            continue
        best_sim = max(_cosine_similarity(j_emb, r) for r in resume_embs)
        if best_sim >= SKILL_GAP_MATCH:
            gap_matched.append(skill)
        elif best_sim >= SKILL_GAP_PARTIAL:
            gap_partial.append(skill)
        else:
            gap_missing.append(skill)

    return skill_score, {
        "matched": gap_matched,
        "partial": gap_partial,
        "missing": gap_missing,
    }


# ─────────────────────────────────────────
# STEP 4 — LLM SCORING (experience + education only)
# ─────────────────────────────────────────

_LLM_SCORE_PROMPT = """\
You are a technical recruiter. Score how well the candidate's {category} matches the job requirement. Use the FULL 0.0–1.0 range.

Scoring guide:
0.0–0.15  Completely unrelated field or tech stack
0.2–0.35  Same broad field but wrong tools (e.g. mobile dev for backend role)
0.4–0.55  Partial match — some overlap but clear gaps
0.6–0.75  Good match — meets most requirements, minor gaps
0.8–0.90  Strong match — meets all core requirements
0.9–1.0   Exceptional — exceeds requirements

Job {category}:
{job_text}

Candidate {category}:
{candidate_text}

Reply in exactly this format (no other text):
SCORE: 0.7
"""


def _parse_llm_score(text: str) -> float | None:
    match = re.search(r"SCORE:\s*([0-9]*\.?[0-9]+)", text)
    if not match:
        return None
    try:
        return max(0.0, min(1.0, float(match.group(1))))
    except ValueError:
        return None


def _llm_score_category(category: str, job_text: str, candidate_text: str) -> float | None:
    if not job_text.strip() or not candidate_text.strip():
        return None
    prompt = _LLM_SCORE_PROMPT.format(
        category=category,
        job_text=job_text[:1000],
        candidate_text=candidate_text[:1000],
    )
    try:
        return _parse_llm_score(_ollama_generate(prompt))
    except Exception as exc:
        print(f"[LLM Score Error] {category}: {exc}")
        return None


# ─────────────────────────────────────────
# STEP 5 — COMBINED SCORE
# Skills: embedding | Experience/Education: LLM
# ─────────────────────────────────────────

def compute_score(
    resume_sections: dict,
    job_sections: dict,
    precomputed_skill_score: float | None = None,
) -> tuple:
    """
    Returns (final_score 0-100, breakdown dict).
    Skills → embedding cosine similarity (fast, accurate for short terms).
    Experience/Education → LLM scoring (understands context for long text).
    """
    scores = {}

    # Skills — embedding (use pre-computed if available)
    if precomputed_skill_score is not None:
        scores["skills"] = precomputed_skill_score
    else:
        job_skills    = _split_skills(job_sections.get("skills", ""))
        resume_skills = _split_skills(resume_sections.get("skills", ""))
        skill_score, _ = _compute_skill_score_and_gap(job_skills, resume_skills)
        scores["skills"] = skill_score

    # Experience + Education — LLM scoring (parallel)
    with ThreadPoolExecutor(max_workers=2) as ex:
        exp_future = ex.submit(
            _llm_score_category, "experience",
            job_sections.get("experience", ""),
            resume_sections.get("experience", ""),
        )
        edu_future = ex.submit(
            _llm_score_category, "education",
            job_sections.get("education", ""),
            resume_sections.get("education", ""),
        )

    scores["experience"] = exp_future.result() or 0.0
    scores["education"]  = edu_future.result() or 0.0

    breakdown = {}
    for category in SECTION_WEIGHTS:
        breakdown[category] = round(scores.get(category, 0.0) * 100, 1)
        print(f"  [{category}] score={scores.get(category, 0.0):.3f} → {breakdown[category]}%")

    final = sum(SECTION_WEIGHTS[c] * breakdown[c] for c in SECTION_WEIGHTS)
    return round(final, 1), breakdown


# ─────────────────────────────────────────
# STEP 5 — SKILL GAP (standalone public API)
# ─────────────────────────────────────────

def analyze_skill_gap(resume_sections: dict, job_sections: dict) -> dict:
    """
    Compare JD skills vs resume skills.
    Returns { matched: [...], partial: [...], missing: [...] }
    """
    job_skills    = _split_skills(job_sections.get("skills", ""))
    resume_skills = _split_skills(resume_sections.get("skills", ""))
    _, gap = _compute_skill_score_and_gap(job_skills, resume_skills)
    return gap


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
    Full pipeline. Computes score AND skill gap in a single pass
    (shared skill embeddings — no duplicate embed calls).

    Returns:
        similarity_score   float 0–100
        breakdown          per-category scores
        resume_extracted   dict saved to applications.extracted_data
        job_extracted      dict saved to job_postings.extracted_requirements
        skill_gap          { matched, partial, missing } lists
    """
    # 1. Raw text
    raw_text = extract_raw_text(file_bytes, filename)

    # 2. Section extraction — parallel when job sections aren't cached
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

    # 3. Skill score + gap — ONE embed call, result shared below
    job_skills    = _split_skills(job_sections.get("skills", ""))
    resume_skills = _split_skills(resume_sections.get("skills", ""))
    skill_score, skill_gap = _compute_skill_score_and_gap(job_skills, resume_skills)

    # 4. Score (skills=embedding, experience/education=LLM)
    final_score, breakdown = compute_score(
        resume_sections, job_sections,
        precomputed_skill_score=skill_score,
    )

    return {
        "similarity_score": final_score,
        "breakdown":        breakdown,
        "resume_extracted": resume_sections,
        "job_extracted":    job_sections,
        "skill_gap":        skill_gap,
    }
