"""Email notifications for application status changes."""

import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from dotenv import load_dotenv

load_dotenv()  # ensure .env is loaded regardless of import order

_STATUS_SUBJECTS = {
    "shortlisted": "You've been shortlisted — {job_title}",
    "interview":   "Interview invitation — {job_title}",
    "rejected":    "Application update — {job_title}",
    "hired":       "Offer extended — {job_title}",
    "reviewed":    "Your application is under review — {job_title}",
    "pending":     "Application received — {job_title}",
}

_STATUS_BODIES = {
    "shortlisted": """\
Hi {name},

Great news! After reviewing your application for <strong>{job_title}</strong>, our team has decided to shortlist you for the next stage of the selection process.

We'll be in touch shortly with more details about the next steps.

Best regards,<br>The HireX Team
""",
    "interview": """\
Hi {name},

Congratulations! We're pleased to invite you for an interview for the position of <strong>{job_title}</strong>.

Our team will reach out to coordinate a time that works for you.

Best regards,<br>The HireX Team
""",
    "rejected": """\
Hi {name},

Thank you for your interest in the <strong>{job_title}</strong> position and for taking the time to apply.

After careful consideration, we've decided to move forward with other candidates whose experience more closely matches our current needs.

We appreciate your effort and wish you the best in your job search.

Best regards,<br>The HireX Team
""",
    "hired": """\
Hi {name},

We're thrilled to let you know that you've been selected for the <strong>{job_title}</strong> position!

A member of our team will contact you soon with the formal offer and next steps.

Congratulations and welcome aboard!

Best regards,<br>The HireX Team
""",
    "reviewed": """\
Hi {name},

We wanted to let you know that your application for <strong>{job_title}</strong> is currently under review by our hiring team.

We'll keep you updated as we progress through our selection process.

Best regards,<br>The HireX Team
""",
}


def _build_html(body_content: str, name: str, job_title: str) -> str:
    filled = body_content.format(name=name, job_title=job_title)
    paragraphs = "".join(
        f"<p style='margin:0 0 12px 0;'>{line}</p>"
        for line in filled.strip().split("\n")
        if line.strip()
    )
    return f"""
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
        <tr>
          <td style="background:#4f46e5;padding:24px 32px;">
            <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:.5px;">HireX</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#374151;font-size:15px;line-height:1.6;">
            {paragraphs}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 24px;color:#9ca3af;font-size:12px;border-top:1px solid #f3f4f6;">
            This is an automated message from HireX. Please do not reply directly to this email.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
"""


def send_status_email(
    to_email: str,
    candidate_name: str,
    job_title: str,
    status: str,
) -> None:
    """
    Send a status-change notification email to the candidate.
    Logs errors but never raises — background task safe.
    """
    # Read credentials fresh every call (picks up .env changes without restart)
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASS", "")
    smtp_from = os.getenv("SMTP_FROM", "") or smtp_user

    if not smtp_user or not smtp_pass:
        print("[Email] SMTP_USER/SMTP_PASS not set in .env — skipping email")
        return

    body_template = _STATUS_BODIES.get(status)
    if not body_template:
        print(f"[Email] No template for status '{status}' — skipping")
        return

    subject = _STATUS_SUBJECTS.get(status, "Application update — {job_title}").format(job_title=job_title)
    html_body = _build_html(body_template, candidate_name or "there", job_title)

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = smtp_from
    msg["To"]      = to_email
    msg.attach(MIMEText(html_body, "html"))

    try:
        print(f"[Email] Connecting to {smtp_host}:{smtp_port} as {smtp_user}")
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.ehlo()
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, to_email, msg.as_string())
        print(f"[Email] ✓ Sent '{status}' notification to {to_email}")
    except smtplib.SMTPAuthenticationError:
        print("[Email] ✗ Authentication failed — check SMTP_USER and SMTP_PASS in .env")
    except smtplib.SMTPException as exc:
        print(f"[Email] ✗ SMTP error: {exc}")
    except Exception as exc:
        print(f"[Email] ✗ Unexpected error sending to {to_email}: {exc}")
