# app/api/jobs.py

import os
import uuid as uuid_mod
from typing import List
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.db.database import get_db, SessionLocal          # <-- import SessionLocal
from app.models.application import Application
from app.models.job import JobPosting
from app.schemas.jobs import ApplicationOut, JobCreate, JobOut, JobUpdate
from app.services.resume_scorer import score_resume_against_job

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ─────────────────────────────────────────
# BACKGROUND SCORING TASK
# ─────────────────────────────────────────

def _run_scoring(
    application_id: UUID,
    file_bytes: bytes,
    filename: str,
    job_id: UUID,
    job_title: str,
    job_experience_level: str,
    job_description: str,
    cached_job_sections: dict | None,
):
    """
    Runs after the apply response is sent.
    Opens its own DB session — never reuses the request session.
    """
    db: Session = SessionLocal()
    try:
        result = score_resume_against_job(
            file_bytes=file_bytes,
            filename=filename,
            job_title=job_title,
            job_experience_level=job_experience_level,
            job_description=job_description,
            cached_job_sections=cached_job_sections,
        )

        # Update application
        app = db.query(Application).filter(Application.id == application_id).first()
        if app:
            app.similarity_score = result["similarity_score"]
            app.extracted_data   = {
                "sections":  result["resume_extracted"],
                "breakdown": result["breakdown"],
            }

        # Update job extracted_requirements only if not already set
        job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
        if job and not job.extracted_requirements:
            job.extracted_requirements = result["job_extracted"]

        db.commit()
        print(f"[Scoring Done] application_id={application_id} score={result['similarity_score']}")

    except Exception as e:
        db.rollback()
        print(f"[Scoring Error] application_id={application_id}: {e}")
    finally:
        db.close()


# ─────────────────────────────────────────
# CANDIDATE — OWN APPLICATIONS
# ─────────────────────────────────────────

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


# ─────────────────────────────────────────
# JOBS CRUD
# ─────────────────────────────────────────

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


# ─────────────────────────────────────────
# APPLY — with background scoring
# ─────────────────────────────────────────

@router.post("/{job_id}/apply", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
def apply_to_job(
    job_id: UUID,
    background_tasks: BackgroundTasks,
    resume: UploadFile = File(...),
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user["role"] != "candidate":
        raise HTTPException(status_code=403, detail="Only candidates can apply")

    # Check job exists
    job = db.query(JobPosting).filter(
        JobPosting.id == job_id,
        JobPosting.is_active == True,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or closed")

    # Check not already applied
    existing = db.query(Application).filter(
        Application.job_id == job_id,
        Application.candidate_id == user["id"],
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Already applied to this job")

    # Validate file type
    allowed_types = {
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }
    if resume.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only PDF, DOC, DOCX files accepted")

    # Read file bytes (needed for scoring in background)
    file_bytes = resume.file.read()

    # Save file to disk
    ext      = os.path.splitext(resume.filename)[1] if resume.filename else ".pdf"
    filename = f"{uuid_mod.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(file_bytes)
    resume_path = f"/api/uploads/{filename}"

    # Create application (score is null — filled by background task)
    application = Application(
        job_id=job_id,
        candidate_id=user["id"],
        resume_path=resume_path,
        status="pending",
        similarity_score=None,
        extracted_data=None,
    )
    db.add(application)
    db.commit()
    db.refresh(application)

    # Snapshot job data before session closes
    job_snapshot = {
        "id":                      job.id,
        "title":                   job.title,
        "experience_level":        job.experience_level or "",
        "description":             job.description or "",
        "extracted_requirements":  job.extracted_requirements,  # None if first applicant
    }

    # Kick off background scoring — response already on the way to client
    background_tasks.add_task(
        _run_scoring,
        application_id=application.id,
        file_bytes=file_bytes,
        filename=resume.filename or filename,
        job_id=job_snapshot["id"],
        job_title=job_snapshot["title"],
        job_experience_level=job_snapshot["experience_level"],
        job_description=job_snapshot["description"],
        cached_job_sections=job_snapshot["extracted_requirements"],
    )

    return application


# ─────────────────────────────────────────
# HR — LIST APPLICATIONS FOR A JOB
# ─────────────────────────────────────────

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

    return (
        db.query(Application)
        .filter(Application.job_id == job_id)
        .order_by(Application.applied_at.desc())
        .all()
    )


# ─────────────────────────────────────────
# HELPER
# ─────────────────────────────────────────

def _job_with_count(job: JobPosting, count: int) -> dict:
    data = JobOut.model_validate(job).model_dump()
    data["application_count"] = count
    return data