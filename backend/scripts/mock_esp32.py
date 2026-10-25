"""
[TESTING ONLY] Hardware Simulation Harness.
Emulates an ESP32 publishing mock telemetry and listening for valve overrides.
Used for local testing when the physical hardware or Wokwi is unavailable.
"""

import time
import json
import random
import paho.mqtt.client as mqtt

BROKER = "broker.hivemq.com"
PORT = 1883
TOPIC_TELEMETRY = "esp32/telemetry"
TOPIC_COMMAND = "esp32/cmd/servo"

def on_connect(client, userdata, flags, reason_code, properties):
    print("[MOCK ESP32] Connected to HiveMQ Broker.")
    client.subscribe(TOPIC_COMMAND)

def on_message(client, userdata, message):
    print(f"[MOCK ESP32] Received actuator command override: {message.payload.decode()}°")

client = mqtt.Client(
    callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
    client_id="mock-esp32-hardware-sim"
)
client.on_connect = on_connect
client.on_message = on_message

client.connect(BROKER, PORT, keepalive=60)
client.loop_start()

print("[MOCK ESP32] Emulating hardware telemetry... Press Ctrl+C to stop.")
try:
    while True:
        # simulated_pot = random.randint(1800, 2400)
        # simulated_servo = int((simulated_pot / 4095.0) * 180)
        simulated_temp = round(random.uniform(100.0, 150.0), 2)
        simulated_pressure = round(random.uniform(20.0, 35.0), 2)
        simulated_time = round(time.time(), 2)

        # payload = json.dumps({"pot_raw": simulated_pot, "servo_deg": simulated_servo})
        payload = json.dumps({
            "temperature": simulated_temp, 
            "pressure": simulated_pressure,
            "time": simulated_time
        })
        client.publish(TOPIC_TELEMETRY, payload)
        print(f"[MOCK ESP32] Published: {payload}")
        time.sleep(1.0)
except KeyboardInterrupt:
    client.loop_stop()
    client.disconnect()
    print("[MOCK ESP32] Stopped.")