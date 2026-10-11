from datetime import datetime, timezone
from sqlalchemy import Column, Integer, DateTime
from app.database import Base

class TelemetryRecord(Base):
    __tablename__ = "telemetry_records"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    pot_raw = Column(Integer, nullable=False)
    servo_deg = Column(Integer, nullable=False)