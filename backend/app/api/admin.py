"""Admin API endpoints."""

from datetime import datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.db.database import get_db
from app.models.application import Application
from app.models.job import JobPosting
from app.models.user import User

router = APIRouter(prefix="/api/admin", tags=["Admin"])


def _require_admin(user: dict):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


@router.get("/stats")
def admin_stats(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(user)
    return {
        "total_users": db.query(func.count(User.id)).scalar(),
        "total_candidates": db.query(func.count(User.id)).filter(User.role == "candidate").scalar(),
        "total_hr": db.query(func.count(User.id)).filter(User.role == "hr").scalar(),
        "total_admins": db.query(func.count(User.id)).filter(User.role == "admin").scalar(),
        "total_jobs": db.query(func.count(JobPosting.id)).scalar(),
        "active_jobs": db.query(func.count(JobPosting.id)).filter(JobPosting.is_active == True).scalar(),
        "total_applications": db.query(func.count(Application.id)).scalar(),
    }


@router.get("/registrations")
def registration_stats(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(user)

    now = datetime.utcnow()
    months = []
    for i in range(6, -1, -1):
        dt = now - timedelta(days=30 * i)
        months.append({"year": dt.year, "month": dt.month, "label": dt.strftime("%b")})

    results = (
        db.query(
            extract("year", User.created_at).label("year"),
            extract("month", User.created_at).label("month"),
            func.count(User.id).label("count"),
        )
        .group_by(extract("year", User.created_at), extract("month", User.created_at))
        .all()
    )

    count_map = {(int(r.year), int(r.month)): r.count for r in results}
    return [
        {"label": m["label"], "count": count_map.get((m["year"], m["month"]), 0)}
        for m in months
    ]


@router.get("/recent-jobs")
def recent_jobs(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(user)
    jobs = (
        db.query(JobPosting)
        .order_by(JobPosting.created_at.desc())
        .limit(6)
        .all()
    )
    result = []
    for job in jobs:
        count = db.query(func.count(Application.id)).filter(Application.job_id == job.id).scalar()
        result.append({
            "id": str(job.id),
            "title": job.title,
            "job_type": job.job_type,
            "is_active": job.is_active,
            "created_at": job.created_at.isoformat() if job.created_at else None,
            "applicant_count": count,
        })
    return result


@router.get("/users")
def list_users(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(user)

    users = db.query(User).order_by(User.created_at.desc()).all()
    return [
        {
            "id": str(u.id),
            "full_name": u.full_name,
            "email": u.email,
            "role": u.role,
            "is_blacklisted": bool(u.is_blacklisted),
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]


class RoleUpdate(BaseModel):
    role: str


@router.put("/users/{user_id}/role")
def update_user_role(
    user_id: UUID,
    body: RoleUpdate,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(user)

    if body.role not in ("candidate", "hr", "admin"):
        raise HTTPException(status_code=400, detail="Invalid role")

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    target.role = body.role
    db.commit()
    return {"id": str(target.id), "role": target.role}


class BlacklistUpdate(BaseModel):
    blacklisted: bool


@router.put("/users/{user_id}/blacklist")
def blacklist_user(
    user_id: UUID,
    body: BlacklistUpdate,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(user)

    if str(user_id) == user.get("id"):
        raise HTTPException(status_code=400, detail="Cannot blacklist yourself")

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    target.is_blacklisted = body.blacklisted
    db.commit()
    return {"id": str(target.id), "is_blacklisted": target.is_blacklisted}


@router.delete("/users/{user_id}")
def delete_user(
    user_id: UUID,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(user)

    if str(user_id) == user.get("id"):
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        db.delete(target)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Cannot delete user: they may have associated records")

    return {"deleted": str(user_id)}
