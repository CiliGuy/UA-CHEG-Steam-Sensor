"""
REST API Route Handlers.
Exposes HTTP GET endpoints for React historical charting and POST endpoints
for manual actuator control. Bridges web UI requests to the database and MQTT client.
"""

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

# ----------------------------------------------------------------------
# WARNING: EMERGENCY STOP ANGLE IS A PROVISIONAL PLACEHOLDER.
# Angle 0 is currently assumed based on basic servo range conventions. # ----------------------------------------------------------------------
@router.post("/actuator/emergency-stop")
def trigger_emergency_stop():
    """Immediately forces the valve actuator to safe state (PENDING VERIFICATION)."""
    SAFE_VALVE_ANGLE = 0  # TODO: Update with confirmed physical seating angle
    success = send_servo_command(SAFE_VALVE_ANGLE)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to transmit E-Stop to MQTT broker")
    return {"status": "EMERGENCY_STOP_TRIGGERED", "actuator_forced_angle": SAFE_VALVE_ANGLE}