from datetime import datetime
from pydantic import BaseModel, Field

class ServoCommandRequest(BaseModel):
    angle: int = Field(..., ge=0, le=180, description="Angle from 0 to 180 degrees")

class TelemetryResponse(BaseModel):
    id: int
    timestamp: datetime
    pot_raw: int
    servo_deg: int

    class Config:
        from_attributes = True