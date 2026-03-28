"""Email notifications — interview scheduling only."""

import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from dotenv import load_dotenv

load_dotenv()  # ensure .env is loaded regardless of import order


def send_interview_email(
    to_email: str,
    candidate_name: str,
    job_title: str,
    scheduled_at_iso: str,
    duration_mins: int,
    meeting_link: str | None,
    notes: str | None,
) -> None:
    """
    Send a rich interview scheduling email with date, time, duration and meeting link.
    Logs errors but never raises — background task safe.
    """
    from datetime import datetime as _dt
    try:
        dt = _dt.fromisoformat(scheduled_at_iso)
        formatted_date = dt.strftime("%A, %B %d, %Y")
        formatted_time = dt.strftime("%I:%M %p")
    except Exception:
        formatted_date = scheduled_at_iso
        formatted_time = ""

    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASS", "")
    smtp_from = os.getenv("SMTP_FROM", "") or smtp_user

    if not smtp_user or not smtp_pass:
        print("[Email] SMTP_USER/SMTP_PASS not set — skipping interview email")
        return

    meeting_row = ""
    if meeting_link:
        meeting_row = f"""<tr>
              <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
                <span style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Meeting Link</span><br>
                <a href="{meeting_link}" style="color:#4f46e5;font-size:14px;font-weight:600;">{meeting_link}</a>
              </td>
            </tr>"""

    notes_section = ""
    if notes:
        notes_section = f"""<div style="background:#f0f9ff;border-left:3px solid #4f46e5;border-radius:6px;padding:12px 16px;margin-top:20px;">
              <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">Notes from HR</div>
              <div style="font-size:14px;color:#374151;line-height:1.6;">{notes}</div>
            </div>"""

    html = f"""<!DOCTYPE html>
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
            <p style="margin:0 0 8px 0;">Hi {candidate_name or 'there'},</p>
            <p style="margin:0 0 24px 0;">Great news — your interview for <strong>{job_title}</strong> has been scheduled. Here are the details:</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
                  <span style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Date</span><br>
                  <span style="color:#111827;font-size:15px;font-weight:700;">{formatted_date}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
                  <span style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Time</span><br>
                  <span style="color:#111827;font-size:15px;font-weight:700;">{formatted_time}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
                  <span style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Duration</span><br>
                  <span style="color:#111827;font-size:15px;font-weight:700;">{duration_mins} minutes</span>
                </td>
              </tr>
              {meeting_row}
            </table>
            {notes_section}
            <p style="margin:20px 0 0 0;color:#6b7280;font-size:13px;">If you need to reschedule or have any questions, please contact the hiring team.</p>
            <p style="margin:12px 0 0 0;">Best regards,<br>The HireX Team</p>
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
</html>"""

    subject = f"Interview scheduled — {job_title}"
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = smtp_from
    msg["To"]      = to_email
    msg.attach(MIMEText(html, "html"))

    try:
        print(f"[Email] Sending interview notification to {to_email}")
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.ehlo()
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, to_email, msg.as_string())
        print(f"[Email] ✓ Interview email sent to {to_email}")
    except smtplib.SMTPAuthenticationError:
        print("[Email] ✗ Authentication failed — check SMTP_USER and SMTP_PASS in .env")
    except smtplib.SMTPException as exc:
        print(f"[Email] ✗ SMTP error: {exc}")
    except Exception as exc:
        print(f"[Email] ✗ Unexpected error sending to {to_email}: {exc}")


