"""HR-specific API endpoints."""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.db.database import get_db
from app.models.application import Application
from app.models.interview import Interview
from app.models.job import JobPosting
from app.models.user import User
from app.services.email_service import send_interview_email
from app.services.resume_scorer import generate_interview_questions


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
