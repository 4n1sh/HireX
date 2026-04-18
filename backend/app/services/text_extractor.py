# app/services/text_extractor.py
# Extract raw text from PDF, DOC, and DOCX resume files.

import io

import docx
import pdfplumber


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

    if ext in ("doc", "docx"):
        document = docx.Document(io.BytesIO(file_bytes))
        return "\n".join(p.text for p in document.paragraphs if p.text.strip())

    raise ValueError(f"Unsupported file type: .{ext}")
