# app/services/contact_parser.py
# Regex-based contact info extraction from raw resume text — no LLM call needed.

import re


def extract_contact_info(raw_text: str) -> dict:
    # Email
    email_match = re.search(r'\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b', raw_text)
    email = email_match.group(0) if email_match else ""

    # Phone — matches most common formats
    phone_match = re.search(
        r'(?:\+?\d{1,3}[\s.\-]?)?(?:\(?\d{2,4}\)?[\s.\-]?)?\d{3,4}[\s.\-]?\d{4}',
        raw_text,
    )
    phone = phone_match.group(0).strip() if phone_match else ""

    # Name — first short line (2–5 words, all title-case, no digits or @ symbols)
    name = ""
    for line in raw_text.split("\n")[:10]:
        line = line.strip()
        if not line:
            continue
        words = line.split()
        if (
            1 < len(words) <= 5
            and "@" not in line
            and not re.search(r"\d", line)
            and all(w[0].isupper() for w in words if w and w[0].isalpha())
        ):
            name = line
            break

    return {"name": name, "email": email, "phone": phone}
