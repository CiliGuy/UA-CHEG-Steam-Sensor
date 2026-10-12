/**
 * -----------------------------------------------------------------------------
 * Reference React component demonstrating polling ingestion and actuator control.
 * Connects to the FastAPI backend running on http://localhost:8000.
 *
 * BACKEND API CONTRACT (HTTP REST):
 * -----------------------------------------------------------------------------
 * 1. GET  /api/telemetry/latest
 *    - Purpose: Fetch the most recent sensor reading for real-time displays.
 *    - Response: { id: int, timestamp: string, pot_raw: int, servo_deg: int }
 *
 * 2. GET  /api/telemetry/history?limit=50
 *    - Purpose: Fetch chronological historical points for line charts.
 *    - Response: Array of telemetry objects [ { ... }, { ... } ]
 *
 * 3. POST /api/actuator/servo
 *    - Purpose: Manually override the valve actuator to a specific angle.
 *    - Body:    { "angle": number } (0 to 180)
 *    - Response: { status: "success", requested_angle: number }
 *
 * 4. POST /api/actuator/emergency-stop
 *    - Purpose: Immediately force the valve to its designated safe state.
 *    - Body:    None
 *    - Response: { status: "EMERGENCY_STOP_TRIGGERED", actuator_forced_angle: number }
 * -----------------------------------------------------------------------------
 */

import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:8000/api';

export default function TelemetryDashboard() {
  const [telemetry, setTelemetry] = useState(null);
  const [error, setError] = useState(null);

  // Poll latest telemetry every 1 second
  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/telemetry/latest`);
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        const data = await response.json();
        setTelemetry(data);
        setError(null);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchLatest();
    const intervalId = setInterval(fetchLatest, 1000); // 1-second cadence matching ESP32

    return () => clearInterval(intervalId); // Cleanup on component unmount
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>Reactor Telemetry Live Monitor</h2>
      {error && <p style={{ color: 'red' }}>Connection Status: Disconnected ({error})</p>}
      {telemetry ? (
        <div>
          <p><strong>Last Updated:</strong> {new Date(telemetry.timestamp).toLocaleTimeString()}</p>
          <p><strong>Sensor (Pot Raw):</strong> {telemetry.pot_raw}</p>
          <p><strong>Valve Position:</strong> {telemetry.servo_deg}°</p>
        </div>
      ) : (
        <p>Waiting for reactor telemetry stream...</p>
      )}
    </div>
  );
}