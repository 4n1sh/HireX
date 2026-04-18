# app/services/_ollama_client.py
# Shared Ollama HTTP client and low-level helpers used across service modules.

import json
import re

import httpx

OLLAMA_BASE_URL = "http://localhost:11434"
EXTRACT_MODEL   = "phi3"
EMBED_MODEL     = "nomic-embed-text"

# Persistent HTTP client — reuses TCP connections across all Ollama calls
_http = httpx.Client(
    timeout=httpx.Timeout(connect=10.0, read=120.0, write=30.0, pool=5.0),
    limits=httpx.Limits(max_connections=8, max_keepalive_connections=4),
)


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


def _to_str(val) -> str:
    if isinstance(val, str):
        return val
    if isinstance(val, dict):
        return ", ".join(f"{k}: {v}" for k, v in val.items() if v)
    if isinstance(val, list):
        return ", ".join(str(item) for item in val)
    return str(val) if val else ""
