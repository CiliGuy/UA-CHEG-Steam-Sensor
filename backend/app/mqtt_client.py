"""
MQTT Ingestion & Publishing Client.
Connects to the MQTT broker on a background thread, ingests live telemetry,
commits records to SQLite, and publishes manual actuator commands to the ESP32.
"""

import json
import uuid
import paho.mqtt.client as mqtt
from app.config import settings
from app.database import SessionLocal
from app.models import TelemetryRecord

# Generate unique client ID to prevent collisions on the public HiveMQ broker
CLIENT_ID = f"reactor-backend-{uuid.uuid4().hex[:8]}"

# Initialize Paho-MQTT using Callback API Version 2 (standard for paho-mqtt >= 2.0)
mqtt_client = mqtt.Client(
    callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
    client_id=CLIENT_ID
)

def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code == 0:
        print(f"[MQTT] Connected successfully to {settings.MQTT_BROKER}:{settings.MQTT_PORT}")
        client.subscribe(settings.TOPIC_TELEMETRY)
        print(f"[MQTT] Subscribed to topic: {settings.TOPIC_TELEMETRY}")
    else:
        print(f"[MQTT] Connection failed with reason code: {reason_code}")

def on_message(client, userdata, message):
    try:
        payload_str = message.payload.decode("utf-8")
        data = json.loads(payload_str)

        # Ignore heartbeat status payloads like {"status": "online"}
        if "pot_raw" in data and "servo_deg" in data:
            db = SessionLocal()
            try:
                record = TelemetryRecord(
                    pot_raw=int(data["pot_raw"]),
                    servo_deg=int(data["servo_deg"])
                )
                db.add(record)
                db.commit()
                print(f"[MQTT -> DB] Saved -> Pot: {record.pot_raw} | Servo: {record.servo_deg}°")
            finally:
                db.close()
    except Exception as e:
        print(f"[MQTT Error] Failed to process incoming message: {e}")

mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message

def start_mqtt():
    """Connects and starts the background listener thread."""
    mqtt_client.connect(settings.MQTT_BROKER, settings.MQTT_PORT, keepalive=60)
    mqtt_client.loop_start()

def stop_mqtt():
    """Stops the listener thread and cleanly disconnects."""
    mqtt_client.loop_stop()
    mqtt_client.disconnect()
    print("[MQTT] Disconnected from broker.")

def send_servo_command(angle: int) -> bool:
    """Publishes a manual actuator angle command to the ESP32."""
    if not (0 <= angle <= 180):
        return False
    result = mqtt_client.publish(settings.TOPIC_COMMAND, payload=str(angle), qos=1)
    return result.rc == mqtt.MQTT_ERR_SUCCESS