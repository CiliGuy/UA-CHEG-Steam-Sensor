"""
Database Table Schemas (SQLAlchemy ORM).
Defines the physical database tables, column types, and indexes 
used to persist telemetry readings received from the reactor hardware.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Float, Integer, DateTime
from app.database import Base

class TelemetryRecord(Base):
    __tablename__ = "telemetry_records"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    
    # pot_raw = Column(Integer, nullable=False)
    # servo_deg = Column(Integer, nullable=False)

    temperature = Column(Float, nullable=False)
    pressure = Column(Float, nullable=False)
    time = Column(Float, nullable=False)