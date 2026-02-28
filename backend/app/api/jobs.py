import os
import uuid as uuid_mod
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.db.database import get_db
from app.models.application import Application
from app.models.job import JobPosting
from app.schemas.jobs import (
    ApplicationOut,
    JobCreate,
    JobOut,
    JobUpdate,
)

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ── Candidate's own applications (before /{job_id} routes) ──

@router.get("/me/applications", response_model=List[ApplicationOut])
def my_applications(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Application)
        .filter(Application.candidate_id == user["id"])
        .order_by(Application.applied_at.desc())
        .all()
    )


# ── Jobs CRUD ────────────────────────────────────────────

@router.post("", response_model=JobOut, status_code=status.HTTP_201_CREATED)
def create_job(
    body: JobCreate,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user["role"] != "hr":
        raise HTTPException(status_code=403, detail="Only HR users can post jobs")

    job = JobPosting(**body.model_dump(), created_by=user["id"])
    db.add(job)
    db.commit()
    db.refresh(job)

    return _job_with_count(job, 0)


@router.get("", response_model=List[JobOut])
def list_jobs(db: Session = Depends(get_db)):
    rows = (
        db.query(JobPosting, func.count(Application.id).label("app_count"))
        .outerjoin(Application, Application.job_id == JobPosting.id)
        .group_by(JobPosting.id)
        .order_by(JobPosting.created_at.desc())
        .all()
    )
    return [_job_with_count(job, count) for job, count in rows]


@router.get("/{job_id}", response_model=JobOut)
def get_job(job_id: UUID, db: Session = Depends(get_db)):
    row = (
        db.query(JobPosting, func.count(Application.id).label("app_count"))
        .outerjoin(Application, Application.job_id == JobPosting.id)
        .filter(JobPosting.id == job_id)
        .group_by(JobPosting.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")
    job, count = row
    return _job_with_count(job, count)


@router.put("/{job_id}", response_model=JobOut)
def update_job(
    job_id: UUID,
    body: JobUpdate,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.created_by != user["id"]:
        raise HTTPException(status_code=403, detail="Not your job posting")

    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(job, key, value)

    db.commit()
    db.refresh(job)

    count = db.query(func.count(Application.id)).filter(Application.job_id == job.id).scalar()
    return _job_with_count(job, count)


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(
    job_id: UUID,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.created_by != user["id"]:
        raise HTTPException(status_code=403, detail="Not your job posting")

    db.delete(job)
    db.commit()


# ── Applications ─────────────────────────────────────────

@router.post("/{job_id}/apply", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
def apply_to_job(
    job_id: UUID,
    resume: UploadFile = File(...),
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user["role"] != "candidate":
        raise HTTPException(status_code=403, detail="Only candidates can apply")

    job = db.query(JobPosting).filter(JobPosting.id == job_id, JobPosting.is_active == True).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or closed")

    existing = (
        db.query(Application)
        .filter(Application.job_id == job_id, Application.candidate_id == user["id"])
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Already applied to this job")

    # Save resume file
    ext = os.path.splitext(resume.filename)[1] if resume.filename else ".pdf"
    filename = f"{uuid_mod.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(resume.file.read())
    resume_path = f"/api/uploads/{filename}"

    application = Application(
        job_id=job_id,
        candidate_id=user["id"],
        resume_path=resume_path,
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    return application


@router.get("/{job_id}/applications", response_model=List[ApplicationOut])
def list_applications(
    job_id: UUID,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.created_by != user["id"]:
        raise HTTPException(status_code=403, detail="Not your job posting")

    return db.query(Application).filter(Application.job_id == job_id).order_by(Application.applied_at.desc()).all()


# ── Helpers ──────────────────────────────────────────────

def _job_with_count(job: JobPosting, count: int) -> dict:
    data = JobOut.model_validate(job).model_dump()
    data["application_count"] = count
    return data
