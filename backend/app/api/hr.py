"""HR-specific API endpoints."""

import threading
from datetime import datetime
from typing import List
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.db.database import SessionLocal, get_db
from app.models.application import Application
from app.models.bulk_screening import BulkScreening
from app.models.interview import Interview
from app.models.job import JobPosting
from app.models.user import User
from app.services.email_service import send_interview_email
from app.services.contact_parser import extract_contact_info
from app.services.question_generator import generate_interview_questions
from app.services.resume_scorer import score_resume_against_job
from app.services.text_extractor import extract_raw_text


class StatusUpdate(BaseModel):
    status: str
    hr_notes: str | None = None


class InterviewCreate(BaseModel):
    scheduled_at: str   # ISO datetime string from browser (local time)
    duration_mins: int = 60
    meeting_link: str | None = None
    notes: str | None = None

router = APIRouter(prefix="/api/hr", tags=["HR"])


def _require_hr(user: dict):
    if user.get("role") != "hr":
        raise HTTPException(status_code=403, detail="HR access required")


@router.get("/stats")
def hr_stats(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_hr(user)
    uid = user["id"]

    total_jobs = db.query(func.count(JobPosting.id)).filter(JobPosting.created_by == uid).scalar()
    active_jobs = (
        db.query(func.count(JobPosting.id))
        .filter(JobPosting.created_by == uid, JobPosting.is_active == True)
        .scalar()
    )
    closed_jobs = total_jobs - active_jobs

    # Total applications across all of this HR's jobs
    total_apps = (
        db.query(func.count(Application.id))
        .join(JobPosting, Application.job_id == JobPosting.id)
        .filter(JobPosting.created_by == uid)
        .scalar()
    )

    # Pending applications
    pending_apps = (
        db.query(func.count(Application.id))
        .join(JobPosting, Application.job_id == JobPosting.id)
        .filter(JobPosting.created_by == uid, Application.status == "pending")
        .scalar()
    )

    # Shortlisted
    shortlisted = (
        db.query(func.count(Application.id))
        .join(JobPosting, Application.job_id == JobPosting.id)
        .filter(JobPosting.created_by == uid, Application.status == "shortlisted")
        .scalar()
    )

    return {
        "total_jobs": total_jobs,
        "active_jobs": active_jobs,
        "closed_jobs": closed_jobs,
        "total_applications": total_apps,
        "pending_applications": pending_apps,
        "shortlisted": shortlisted,
    }


@router.get("/recent-applications")
def hr_recent_applications(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_hr(user)

    apps = (
        db.query(Application)
        .join(JobPosting, Application.job_id == JobPosting.id)
        .filter(JobPosting.created_by == user["id"])
        .order_by(Application.applied_at.desc())
        .limit(8)
        .all()
    )

    result = []
    for a in apps:
        job = db.query(JobPosting).filter(JobPosting.id == a.job_id).first()
        result.append({
            "id": str(a.id),
            "job_title": job.title if job else "Unknown",
            "status": a.status,
            "similarity_score": a.similarity_score,
            "applied_at": a.applied_at.isoformat() if a.applied_at else None,
        })
    return result


@router.put("/applications/{application_id}/status")
def update_application_status(
    application_id: UUID,
    body: StatusUpdate,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_hr(user)

    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    job = db.query(JobPosting).filter(JobPosting.id == app.job_id).first()
    if not job or job.created_by != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    valid_statuses = {"pending", "reviewed", "shortlisted", "interview", "rejected", "hired"}
    if body.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")

    app.status = body.status
    if body.hr_notes is not None:
        app.hr_notes = body.hr_notes
    db.commit()

    return {"id": str(app.id), "status": app.status}


# ─────────────────────────────────────────
# INTERVIEW SCHEDULING
# ─────────────────────────────────────────

def _interview_dict(interview: Interview) -> dict:
    return {
        "id": str(interview.id),
        "application_id": str(interview.application_id),
        "scheduled_at": interview.scheduled_at.isoformat(),
        "duration_mins": interview.duration_mins,
        "meeting_link": interview.meeting_link,
        "notes": interview.notes,
        "status": interview.status,
    }


@router.post("/applications/{application_id}/interview")
def schedule_interview(
    application_id: UUID,
    body: InterviewCreate,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_hr(user)

    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    job = db.query(JobPosting).filter(JobPosting.id == app.job_id).first()
    if not job or job.created_by != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        scheduled_at = datetime.fromisoformat(body.scheduled_at)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid scheduled_at — use ISO format")

    # Upsert: update if one already exists, else create
    existing = db.query(Interview).filter(
        Interview.application_id == application_id,
        Interview.status != "cancelled",
    ).first()

    if existing:
        existing.scheduled_at = scheduled_at
        existing.duration_mins = body.duration_mins
        existing.meeting_link = body.meeting_link
        existing.notes = body.notes
        db.commit()
        interview = existing
    else:
        interview = Interview(
            application_id=application_id,
            scheduled_at=scheduled_at,
            duration_mins=body.duration_mins,
            meeting_link=body.meeting_link,
            notes=body.notes,
            status="scheduled",
        )
        db.add(interview)
        app.status = "interview"
        db.commit()
        db.refresh(interview)

    candidate = db.query(User).filter(User.id == app.candidate_id).first()
    if candidate:
        background_tasks.add_task(
            send_interview_email,
            to_email=candidate.email,
            candidate_name=candidate.full_name or candidate.email.split("@")[0],
            job_title=job.title,
            scheduled_at_iso=interview.scheduled_at.isoformat(),
            duration_mins=interview.duration_mins,
            meeting_link=interview.meeting_link,
            notes=interview.notes,
        )

    return _interview_dict(interview)


@router.delete("/interviews/{interview_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_interview(
    interview_id: UUID,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_hr(user)

    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    app = db.query(Application).filter(Application.id == interview.application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    job = db.query(JobPosting).filter(JobPosting.id == app.job_id).first()
    if not job or job.created_by != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    db.delete(interview)
    app.status = "shortlisted"
    db.commit()


@router.post("/applications/{application_id}/interview-questions")
def get_interview_questions(
    application_id: UUID,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_hr(user)

    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    job = db.query(JobPosting).filter(JobPosting.id == app.job_id).first()
    if not job or job.created_by != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    # Return cached questions if already generated
    extracted = app.extracted_data or {}
    if extracted.get("interview_questions"):
        return {"questions": extracted["interview_questions"], "cached": True}

    resume_sections = extracted.get("sections", {})
    job_sections = job.extracted_requirements or {}

    if not resume_sections or not job_sections:
        raise HTTPException(status_code=400, detail="Resume or job data not yet processed")

    questions = generate_interview_questions(resume_sections, job_sections)
    if not questions:
        raise HTTPException(status_code=500, detail="Failed to generate questions")

    # Cache in extracted_data
    extracted["interview_questions"] = questions
    app.extracted_data = extracted
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(app, "extracted_data")
    db.commit()

    return {"questions": questions, "cached": False}


# ─────────────────────────────────────────
# BULK RESUME SCREENING
# ─────────────────────────────────────────

def _bulk_screening_dict(r: BulkScreening) -> dict:
    return {
        "id": str(r.id),
        "filename": r.filename,
        "candidate_name": r.candidate_name,
        "candidate_email": r.candidate_email,
        "candidate_phone": r.candidate_phone,
        "score": r.score,
        "extracted_data": r.extracted_data,
        "status": r.status,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


def _run_bulk_processing(items: list, job_id: UUID):
    """
    Background thread: process each (screening_id, file_bytes, filename) sequentially.
    Creates its own DB session — safe to run in a thread.
    """
    db = SessionLocal()
    try:
        job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
        if not job:
            return

        cached_job_sections = job.extracted_requirements or None

        for screening_id, file_bytes, filename in items:
            screening = db.query(BulkScreening).filter(BulkScreening.id == screening_id).first()
            if not screening:
                continue
            try:
                raw_text = extract_raw_text(file_bytes, filename)
                contact = extract_contact_info(raw_text)

                result = score_resume_against_job(
                    file_bytes,
                    filename,
                    job.title,
                    getattr(job, "experience_level", "") or "",
                    job.description,
                    cached_job_sections=cached_job_sections,
                )

                # Cache job sections after first extraction so subsequent resumes reuse it
                if not cached_job_sections and result.get("job_extracted"):
                    cached_job_sections = result["job_extracted"]
                    job.extracted_requirements = cached_job_sections
                    db.commit()

                screening.candidate_name = contact.get("name") or None
                screening.candidate_email = contact.get("email") or None
                screening.candidate_phone = contact.get("phone") or None
                screening.score = result["similarity_score"]
                screening.extracted_data = {
                    "sections": result["resume_extracted"],
                    "breakdown": result["breakdown"],
                    "skill_gap": result["skill_gap"],
                }
                screening.status = "done"

            except Exception as exc:
                print(f"[BulkScreen] Error processing {filename}: {exc}")
                screening.status = "failed"

            db.commit()

    finally:
        db.close()


@router.post("/jobs/{job_id}/bulk-screen")
async def bulk_screen_resumes(
    job_id: UUID,
    files: List[UploadFile] = File(...),
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_hr(user)

    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job or str(job.created_by) != str(user["id"]):
        raise HTTPException(status_code=403, detail="Access denied")

    allowed = {"pdf", "doc", "docx"}
    valid = [(f, f.filename) for f in files if f.filename.lower().rsplit(".", 1)[-1] in allowed]
    if not valid:
        raise HTTPException(status_code=400, detail="No valid files — upload PDF, DOC, or DOCX")

    # Read bytes upfront — UploadFile can't be passed to a thread
    file_data = []
    for upload, filename in valid:
        content = await upload.read()
        file_data.append((filename, content))

    hr_uuid = UUID(str(user["id"]))

    # Create a processing record per file
    screening_items = []
    for filename, content in file_data:
        record = BulkScreening(job_id=job_id, hr_id=hr_uuid, filename=filename, status="processing")
        db.add(record)
        db.flush()
        screening_items.append((record.id, content, filename))
    db.commit()

    threading.Thread(
        target=_run_bulk_processing,
        args=(screening_items, job_id),
        daemon=True,
    ).start()

    return {"total": len(screening_items), "job_id": str(job_id)}


@router.get("/jobs/{job_id}/bulk-screenings")
def get_bulk_screenings(
    job_id: UUID,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_hr(user)

    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job or str(job.created_by) != str(user["id"]):
        raise HTTPException(status_code=403, detail="Access denied")

    records = (
        db.query(BulkScreening)
        .filter(BulkScreening.job_id == job_id)
        .order_by(BulkScreening.score.desc())
        .all()
    )

    processing = sum(1 for r in records if r.status == "processing")
    return {
        "total": len(records),
        "processing": processing,
        "results": [_bulk_screening_dict(r) for r in records],
    }


@router.delete("/bulk-screenings/{screening_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bulk_screening(
    screening_id: UUID,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_hr(user)

    record = db.query(BulkScreening).filter(BulkScreening.id == screening_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Not found")

    job = db.query(JobPosting).filter(JobPosting.id == record.job_id).first()
    if not job or str(job.created_by) != str(user["id"]):
        raise HTTPException(status_code=403, detail="Access denied")

    db.delete(record)
    db.commit()
