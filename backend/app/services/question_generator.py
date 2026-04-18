# app/services/question_generator.py
# AI-powered interview question generation and cover letter writing.

import json
import re

from app.services._ollama_client import _ollama_generate

# ─────────────────────────────────────────
# INTERVIEW QUESTIONS
# ─────────────────────────────────────────

_INTERVIEW_Q_PROMPT = """\
You are a senior technical interviewer. Given the job description and candidate resume below, generate 5-8 tailored interview questions.

Focus on:
- Skill gaps: areas where the candidate may be weak relative to the job requirements
- Experience verification: dig into claims made on the resume
- Technical depth: test real understanding of technologies they claim to know
- Culture/role fit: behavioral questions relevant to the role

Job requirements:
Skills: {job_skills}
Experience: {job_experience}
Education: {job_education}

Candidate profile:
Skills: {resume_skills}
Experience: {resume_experience}
Education: {resume_education}

Return ONLY a JSON array of question strings, no numbering, no explanation:
["Question 1?", "Question 2?", ...]
"""


def generate_interview_questions(resume_sections: dict, job_sections: dict) -> list:
    """Generate 5-8 tailored interview questions based on resume vs JD."""
    prompt = _INTERVIEW_Q_PROMPT.format(
        job_skills=job_sections.get("skills", "")[:500],
        job_experience=job_sections.get("experience", "")[:500],
        job_education=job_sections.get("education", "")[:300],
        resume_skills=resume_sections.get("skills", "")[:500],
        resume_experience=resume_sections.get("experience", "")[:500],
        resume_education=resume_sections.get("education", "")[:300],
    )
    try:
        raw = _ollama_generate(prompt)
        cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip())
        cleaned = re.sub(r"\s*```$", "", cleaned).strip()
        questions = json.loads(cleaned)
        if isinstance(questions, list):
            return [q for q in questions if isinstance(q, str) and q.strip()]
    except Exception as exc:
        print(f"[Interview Q Error] {exc}")
    return []


# ─────────────────────────────────────────
# COVER LETTER
# ─────────────────────────────────────────

_COVER_LETTER_PROMPT = """\
Write a short cover letter for {candidate_name} applying to the {job_title} role.

Candidate skills: {resume_skills}
Candidate experience: {resume_experience}
Job requires: {job_skills}

STRICT RULES (follow exactly):
- Candidate name is: {candidate_name}
- NEVER use square brackets like [Company Name], [Job Source], [Your Name] — these are FORBIDDEN
- NEVER mention LinkedIn, job boards, websites, or where the posting was found
- Say "your company" or "your team" instead of a company name
- Start with "Dear Hiring Manager,"
- End with "Sincerely,\\n{candidate_name}"
- Maximum 2 short paragraphs, under 120 words total
- Mention 3-4 specific technologies from the resume that match the job
- Return ONLY the letter text, nothing else
"""


def generate_cover_letter(resume_sections: dict, job_sections: dict, job_title: str, candidate_name: str) -> str:
    """Generate a tailored cover letter from resume + JD."""
    prompt = _COVER_LETTER_PROMPT.format(
        candidate_name=candidate_name,
        job_title=job_title,
        job_skills=job_sections.get("skills", "")[:500],
        resume_skills=resume_sections.get("skills", "")[:500],
        resume_experience=resume_sections.get("experience", "")[:500],
    )
    try:
        return _ollama_generate(prompt).strip()
    except Exception as exc:
        print(f"[Cover Letter Error] {exc}")
    return ""
