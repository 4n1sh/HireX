from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


# ── Job Schemas ──────────────────────────────────────────

class JobCreate(BaseModel):
    title: str
    description: str
    location: Optional[str] = None
    job_type: Optional[str] = None          # full_time, part_time, contract, internship
    experience_level: Optional[str] = None  # entry, mid, senior, lead
    deadline: Optional[date] = None


class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    job_type: Optional[str] = None
    experience_level: Optional[str] = None
    is_active: Optional[bool] = None
    deadline: Optional[date] = None


class JobOut(BaseModel):
    id: UUID
    created_by: UUID
    title: str
    description: str
    location: Optional[str]
    job_type: Optional[str]
    experience_level: Optional[str]
    is_active: bool
    deadline: Optional[date]
    created_at: datetime
    updated_at: datetime
    application_count: Optional[int] = 0

    class Config:
        from_attributes = True


# ── Application Schemas ──────────────────────────────────

class ApplicationOut(BaseModel):
    id: UUID
    job_id: UUID
    candidate_id: UUID
    resume_path: str
    status: str
    similarity_score: Optional[float]
    extracted_data: Optional[dict]
    hr_notes: Optional[str]
    applied_at: datetime

    def scoring(self) -> str:
        return "done" if self.similarity_score is not None else "in_progress"
    
    class Config:
        from_attributes = True

