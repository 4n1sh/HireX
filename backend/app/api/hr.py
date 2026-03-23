"""HR-specific API endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.db.database import get_db
from app.models.application import Application
from app.models.job import JobPosting


class StatusUpdate(BaseModel):
    status: str
    hr_notes: str | None = None

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
