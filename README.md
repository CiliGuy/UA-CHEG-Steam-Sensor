# Reactor CPS Backend: Ingestion Engine & Control API

A modular Python backend designed for a Chemical Reactor Cyber-Physical System (CPS) capstone project. This service bridges the embedded ESP32 microcontroller and the React frontend by ingesting real-time MQTT telemetry, persisting time-series data to a local SQLite database, and exposing REST endpoints for dashboard visualization and manual actuator control.

---

## Architecture Overview

```text
[ Physical Reactor / ESP32 ]
            │ (Wi-Fi / SoftAP)
            ▼
    [ MQTT Broker ] ── (broker.hivemq.com:1883 / University Broker)
            │
            ▼ (MQTT Subscription: esp32/telemetry)
[ Python Backend (FastAPI + Paho-MQTT) ]
   ├── Background Thread: Ingests packets & writes to SQLite (reactor_telemetry.db)
   ├── REST API: Serves latest & historical readings to web clients (Port 8000)
   └── MQTT Publisher: Transmits actuator overrides (esp32/cmd/servo)
            │
            ▼ (HTTP REST / JSON)
   [ React Frontend (JSX) ]
```

---

## Directory Structure

```text
backend/
├── .env                          # Broker host, ports, and database credentials
├── requirements.txt              # Project dependencies
├── app/
│   ├── __init__.py
│   ├── config.py                 # Pydantic Settings (loads environment variables)
│   ├── database.py               # SQLite engine & thread-safe session factory
│   ├── models.py                 # SQLAlchemy table schemas (TelemetryRecord)
│   ├── schemas.py                # Pydantic validation models (API request/response)
│   ├── mqtt_client.py            # Paho-MQTT v2 background listener & publisher
│   ├── main.py                   # FastAPI app entry point & CORS configuration
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes.py             # REST endpoints (telemetry & actuator overrides)
│   └── ml/                       # [ROADMAP] Isolation Forest anomaly detection
├── docs/
│   └── frontend_reference/
│       └── Dashboard.jsx         # Sample React component showing polling & API calls
└── scripts/
    └── mock_esp32.py             # CLI simulation harness for standalone testing
```

---

## Important Hardware & Network Notes

*   **Telemetry Schema (Provisional):** The current pipeline parses `pot_raw` (simulated sensor) and `servo_deg` (simulated valve). Once physical sensor channels are locked down (e.g., inner/outer thermocouple temperatures, pressure transducer, condensation), update field definitions across `models.py`, `schemas.py`, and `mqtt_client.py`.
*   **Emergency Stop (E-Stop) Angle Warning:** The emergency stop endpoint currently forces the servo to angle $0^\circ$. **This is an unverified placeholder.** Do not run this command against physical piping until mechanical limits, valve seating orientation (fail-closed vs. fail-open), and travel bounds (e.g., $0^\circ$ to $90^\circ$) are confirmed with the hardware team.
*   **MQTT Broker Address:** The system is configured to connect to the public HiveMQ sandbox (`broker.hivemq.com:1883`). When the official university broker is provisioned, update `MQTT_BROKER` and `MQTT_PORT` in `.env`.

---

## Quickstart & Local Setup

### 1. Environment Installation
From the project root:

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# macOS / Linux:
source venv/bin/activate
# Windows (Command Prompt):
venv\Scripts\activate.bat
# Windows (PowerShell):
venv\Scripts\Activate.ps1

# Install required packages
pip install -r requirements.txt
```

### 2. Launch the Backend Server
```bash
uvicorn app.main:app --reload --port 8000
```

Upon startup, the console will verify:
1. SQLite tables initialized (`reactor_telemetry.db`).
2. Paho-MQTT client connected and subscribed to `esp32/telemetry`.
3. Uvicorn server running on `http://127.0.0.1:8000`.

---

## Testing the Pipeline

### Ingestion Testing (Pick One)
*   **Wokwi Simulation:** Run the C++ ESP32 project in Wokwi. As the virtual board connects to Wi-Fi, incoming readings will stream to the FastAPI console and commit to SQLite.
*   **Standalone Mock Script:** Open a second terminal window (with `venv` activated) and run:
    ```bash
    python scripts/mock_esp32.py
    ```

### Frontend & API Verification (Pick One)
*   **Interactive Swagger UI:** Open `http://localhost:8000/docs` in your browser to inspect and trigger endpoints directly.
*   **Local Browser Dashboard:** Double-click `docs/test_dashboard.html` to open it in Chrome or Firefox. It polls `http://localhost:8000/api/telemetry/latest` every second and includes an Emergency Stop button that dispatches a command over MQTT.

---

## API Reference Sheet

| Method | Endpoint | Description | Request Body | Response |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | Service health status | None | `{"status": "healthy", ...}` |
| `GET` | `/api/telemetry/latest` | Most recent database reading | None | `{"id": int, "timestamp": str, "pot_raw": int, "servo_deg": int}` |
| `GET` | `/api/telemetry/history?limit=50` | Chronological readings for charting | None | Array of telemetry objects |
| `POST`| `/api/actuator/servo` | Manual actuator angle override | `{"angle": 90}` ($0 \le \text{angle} \le 180$) | `{"status": "success", "requested_angle": 90}` |
| `POST`| `/api/actuator/emergency-stop`| Emergency actuator cutoff | None | `{"status": "EMERGENCY_STOP_TRIGGERED", ...}` |

---

## Development Roadmap

1.  **Refactor Sensor Schema:** Swap `pot_raw` and `servo_deg` for real thermocouple, pressure, and mass load cell attributes once confirmed.
2.  **Verify Mechanical Limits:** Calibrate physical valve limits and update `SAFE_VALVE_ANGLE` in `app/api/routes.py`.
3.  **Deploy Anomaly Detection (`app/ml/`):** Train an unsupervised **Isolation Forest** on baseline "gold standard" reactor runs to flag hardware deviations (e.g., stuck valve, thermal runaway) in real time. (?)