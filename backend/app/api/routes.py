from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models import TelemetryRecord
from app.schemas import ServoCommandRequest, TelemetryResponse
from app.mqtt_client import send_servo_command

router = APIRouter(prefix="/api", tags=["Reactor"])

@router.get("/telemetry/latest", response_model=TelemetryResponse)
def get_latest_telemetry(db: Session = Depends(get_db)):
    """Fetch the most recent reading received from the ESP32."""
    record = db.query(TelemetryRecord).order_by(desc(TelemetryRecord.id)).first()
    if not record:
        raise HTTPException(status_code=404, detail="No telemetry data recorded yet")
    return record

@router.get("/telemetry/history", response_model=List[TelemetryResponse])
def get_telemetry_history(limit: int = 50, db: Session = Depends(get_db)):
    """Fetch recent readings for charting in React."""
    records = db.query(TelemetryRecord).order_by(desc(TelemetryRecord.id)).limit(limit).all()
    return records[::-1]  # Return in chronological order for line charts

@router.post("/actuator/servo", status_code=status.HTTP_200_OK)
def override_servo_angle(command: ServoCommandRequest):
    """Publish a command to the ESP32 over MQTT to adjust the servo valve."""
    success = send_servo_command(command.angle)
    if not success:
        raise HTTPException(
            status_code=500, 
            detail="Failed to publish command to MQTT broker"
        )
    return {"status": "success", "requested_angle": command.angle}