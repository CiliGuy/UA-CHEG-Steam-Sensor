// Sample React component for use of backend
// Sample component to demonstrate how to get

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