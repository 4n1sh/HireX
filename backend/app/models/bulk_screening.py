import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.db.database import Base


class BulkScreening(Base):
    __tablename__ = "bulk_screenings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("job_postings.id", ondelete="CASCADE"), nullable=False)
    hr_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    filename = Column(Text, nullable=False)
    candidate_name = Column(Text, nullable=True)
    candidate_email = Column(Text, nullable=True)
    candidate_phone = Column(Text, nullable=True)
    score = Column(Float, nullable=True)
    extracted_data = Column(JSONB, nullable=True)   # { sections, breakdown, skill_gap }
    status = Column(Text, default="processing")     # processing | done | failed
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
