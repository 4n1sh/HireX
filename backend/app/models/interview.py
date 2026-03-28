import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import UUID

from app.db.database import Base


class Interview(Base):
    __tablename__ = "interviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id = Column(
        UUID(as_uuid=True),
        ForeignKey("applications.id", ondelete="CASCADE"),
        nullable=False,
    )
    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    duration_mins = Column(Integer, default=60)
    meeting_link = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(Text, default="scheduled")  # scheduled, completed, cancelled
    created_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
