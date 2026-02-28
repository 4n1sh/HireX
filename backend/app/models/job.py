import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, Date, DateTime, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.db.database import Base


class JobPosting(Base):
    __tablename__ = "job_postings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_by = Column(UUID(as_uuid=True), nullable=False)  # profiles.id (HR user)
    title = Column(Text, nullable=False)
    description = Column(Text, nullable=False)
    location = Column(Text, nullable=True)
    job_type = Column(Text, nullable=True)             # full_time, part_time, contract, internship
    experience_level = Column(Text, nullable=True)     # entry, mid, senior, lead
    extracted_requirements = Column(JSONB, nullable=True)
    is_active = Column(Boolean, default=True)
    deadline = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    applications = relationship("Application", back_populates="job", cascade="all, delete-orphan")
