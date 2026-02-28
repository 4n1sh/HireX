import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.db.database import Base


class Application(Base):
    __tablename__ = "applications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("job_postings.id"), nullable=False)
    candidate_id = Column(UUID(as_uuid=True), nullable=False)  # profiles.id
    resume_path = Column(Text, nullable=False)
    extracted_data = Column(JSONB, nullable=True)
    similarity_score = Column(Float, nullable=True)
    status = Column(Text, default="pending")  # pending, reviewed, shortlisted, interview, rejected, hired
    hr_notes = Column(Text, nullable=True)
    applied_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    job = relationship("JobPosting", back_populates="applications")
