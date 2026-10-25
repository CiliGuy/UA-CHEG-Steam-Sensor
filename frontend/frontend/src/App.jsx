import { useEffect, useState } from 'react'

const apiUrl = (import.meta.env.VITE_API_URL?.trim() || 'http://localhost:8000').replace(/\/+$/, '')
const telemetryUrl = `${apiUrl}/api/telemetry/latest`
const telemetryHistoryUrl = `${apiUrl}/api/telemetry/history?limit=10`
const servoCommandUrl = `${apiUrl}/api/actuator/servo`

function formatReading(value, digits = 1) {
  return typeof value === 'number' ? value.toFixed(digits) : '--'
}

function formatDeviceTime(value) {
  return Number.isFinite(value) ? new Date(value * 1000).toLocaleTimeString() : '--'
}

async function readResponse(response) {
  let body
  try {
    body = await response.json()
  } catch {
    body = {}
  }

  if (!response.ok) {
    throw new Error(body.detail || `Request failed with status ${response.status}.`)
  }
  return body
}

function isTelemetryReading(reading) {
  return (
    reading
    && Number.isFinite(reading.id)
    && Number.isFinite(reading.temperature)
    && Number.isFinite(reading.pressure)
    && Number.isFinite(reading.time)
    && typeof reading.timestamp === 'string'
  )
}

function StatusLine({ icon, children }) {
  return (
    <div className="status-line">
      <span className="status-line-icon">{icon}</span>
      <span>{children}</span>
    </div>
  )
}

function Card({ title, status, statusTone = '', children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      <div className="card-title-row">
        <h2>{title}</h2>
        {status && (
          <span className={`card-status ${statusTone}`}>
            <span className="online-dot" />
            {status}
          </span>
        )}
      </div>
      {children}
    </section>
  )
}

function App() {
  const [servoTarget, setServoTarget] = useState(90)
  const [note, setNote] = useState('')
  const [logs, setLogs] = useState([])
  const [apiStatus, setApiStatus] = useState('connecting')
  const [apiError, setApiError] = useState('')
  const [telemetryHistory, setTelemetryHistory] = useState([])
  const [commandMessage, setCommandMessage] = useState('')
  const [emergencyMessage, setEmergencyMessage] = useState('')
  const [emergencyPending, setEmergencyPending] = useState(false)
  const [telemetry, setTelemetry] = useState(null)

  useEffect(() => {
    let active = true
    let timeoutId
    let controller

    const refreshDashboard = async () => {
      controller = new AbortController()
      const options = { signal: controller.signal }
      const [healthResult, latestResult, historyResult] = await Promise.allSettled([
        fetch(apiUrl, options).then(readResponse),
        fetch(telemetryUrl, options).then(async (response) => (
          response.status === 404 ? null : readResponse(response)
        )),
        fetch(telemetryHistoryUrl, options).then(readResponse),
      ])

      if (active) {
        const errors = []

        if (
          healthResult.status === 'fulfilled'
          && healthResult.value.status === 'healthy'
        ) {
          setApiStatus('connected')
        } else {
          setApiStatus('disconnected')
          errors.push(
            healthResult.status === 'rejected'
              ? `Health check failed: ${healthResult.reason.message}`
              : 'Health check returned an unexpected response.',
          )
        }

        if (latestResult.status === 'fulfilled') {
          const reading = latestResult.value
          if (reading === null) {
            setTelemetry(null)
          } else if (isTelemetryReading(reading)) {
            setTelemetry(reading)
          } else {
            errors.push('Latest telemetry response has an unexpected format.')
          }
        } else {
          errors.push(`Latest telemetry request failed: ${latestResult.reason.message}`)
        }

        if (
          historyResult.status === 'fulfilled'
          && Array.isArray(historyResult.value)
          && historyResult.value.every(isTelemetryReading)
        ) {
          setTelemetryHistory(historyResult.value)
        } else {
          errors.push(
            historyResult.status === 'rejected'
              ? `Telemetry history request failed: ${historyResult.reason.message}`
              : 'Telemetry history response has an unexpected format.',
          )
        }

        setApiError(errors.join(' '))
      }

      if (active) timeoutId = setTimeout(refreshDashboard, 3000)
    }

    refreshDashboard()
    return () => {
      active = false
      clearTimeout(timeoutId)
      controller?.abort()
    }
  }, [])

  const sendServoCommand = async () => {
    setCommandMessage('')
    try {
      const response = await fetch(servoCommandUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ angle: servoTarget }),
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.detail || `Request failed with status ${response.status}.`)
      }
      setCommandMessage(`Command sent for ${result.requested_angle}°; actuator position is not confirmed.`)
    } catch (error) {
      setCommandMessage(`Could not send servo command: ${error.message}`)
    }
  }

  const sendEmergencyStop = async () => {
    const confirmed = window.confirm(
      'The backend currently sends the servo to 0°, which is an unverified placeholder. Proceed only if 0° is confirmed safe for your hardware.',
    )
    if (!confirmed) return

    setEmergencyPending(true)
    setEmergencyMessage('')
    try {
      const response = await fetch(`${apiUrl}/api/actuator/emergency-stop`, { method: 'POST' })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.detail || `Request failed with status ${response.status}.`)
      }
      setEmergencyMessage(
        `Emergency-stop command sent (${result.actuator_forced_angle}°); actuator position is not confirmed.`,
      )
    } catch (error) {
      setEmergencyMessage(`Could not send emergency-stop command: ${error.message}`)
    } finally {
      setEmergencyPending(false)
    }
  }

  const submitNote = () => {
    const trimmedNote = note.trim()
    if (!trimmedNote) return
    setLogs((currentLogs) => [...currentLogs, trimmedNote])
    setNote('')
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Chemical Steam Sensor</h1>
        <div className="header-actions">
          <button aria-label="Notifications" className="header-icon">♟</button>
          <button aria-label="User profile" className="profile-icon">◯</button>
        </div>
      </header>

      <main className="dashboard">
        <Card title="System Status" className="status-card">
          <div className="status-list">
            <StatusLine icon="▣">Device: {telemetry ? 'Telemetry available' : 'Waiting for telemetry'}</StatusLine>
            <StatusLine icon="◷">
              Last update: {telemetry ? new Date(telemetry.timestamp).toLocaleTimeString() : 'Waiting for telemetry'}
            </StatusLine>
            <StatusLine icon="◷">
              Device time: {telemetry ? formatDeviceTime(telemetry.time) : 'Waiting for telemetry'}
            </StatusLine>
          </div>
        </Card>

        <Card title="Operator Logs" className="logs-card">
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Enter shift logs, inspection notes, or steam pressure override remarks here..."
            aria-label="Operator log note"
          />
          <div className="logs-footer">
            <span>Auto-saved: Just now</span>
            <button className="small-button" onClick={submitNote}>Submit Note</button>
          </div>
          {logs.length > 0 && (
            <div className="submitted-logs">
              {logs.map((entry, index) => <p key={`${entry}-${index}`}>{entry}</p>)}
            </div>
          )}
        </Card>

        <Card
          title="Temperature"
          className="reading-card"
          status={telemetry ? 'live' : 'waiting'}
          statusTone={telemetry ? 'connected' : ''}
        >
          <div className="reading">{formatReading(telemetry?.temperature, 2)}</div>
          <p className="limit">Latest sensor reading</p>
        </Card>

        <Card
          title="Pressure"
          className="reading-card pressure-card"
          status={telemetry ? 'live' : 'waiting'}
          statusTone={telemetry ? 'connected' : ''}
        >
          <div className="reading">{formatReading(telemetry?.pressure, 2)}</div>
          <p className="limit">Latest sensor reading</p>
        </Card>

        <Card title="Backend Health" className="health-card" status={apiStatus} statusTone={apiStatus === 'connected' ? 'connected' : ''}>
          <p className="connection-help">Health endpoint: {apiUrl}/</p>
          {apiError && <p className="connection-error" role="alert">{apiError}</p>}
        </Card>

        <Card title="Servo Command Target" className="actuator-card">
          <div className="actuator-control">
            <button aria-label="Decrease servo target" onClick={() => setServoTarget((value) => Math.max(0, value - 5))}>◀</button>
            <div className="actuator-reading">
              <strong>{servoTarget}°</strong>
              <span>RANGE: 0–180°</span>
            </div>
            <button aria-label="Increase servo target" onClick={() => setServoTarget((value) => Math.min(180, value + 5))}>▶</button>
          </div>
          <input
            type="range"
            min="0"
            max="180"
            value={servoTarget}
            onChange={(event) => setServoTarget(Number(event.target.value))}
            aria-label="Servo command target"
          />
          <button
            className="primary-button command-button"
            onClick={sendServoCommand}
            disabled={apiStatus !== 'connected'}
          >
            SEND SERVO COMMAND
          </button>
          {commandMessage && (
            <p className="command-message" role="status">
              {commandMessage}
            </p>
          )}
        </Card>

        <Card title="Recent Telemetry" className="history-card">
          {telemetryHistory.length > 0 ? (
            <div className="history-table-wrap">
              <table className="history-table">
                <thead>
                  <tr>
                    <th scope="col">Recorded</th>
                    <th scope="col">Temperature</th>
                    <th scope="col">Pressure</th>
                    <th scope="col">Device time</th>
                  </tr>
                </thead>
                <tbody>
                  {[...telemetryHistory].reverse().map((reading) => (
                    <tr key={reading.id}>
                      <td>{new Date(reading.timestamp).toLocaleTimeString()}</td>
                      <td>{formatReading(reading.temperature, 2)}</td>
                      <td>{formatReading(reading.pressure, 2)}</td>
                      <td>{formatDeviceTime(reading.time)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="connection-help">No telemetry history available yet.</p>
          )}
        </Card>

        <section className="emergency-card emergency-dashboard-card" aria-labelledby="emergency-title">
          <h2 id="emergency-title">Emergency Control</h2>
          <p>
            The backend currently uses 0° as an unverified placeholder. Confirm this angle is safe
            for your hardware before sending.
          </p>
          <button
            className="emergency-button"
            onClick={sendEmergencyStop}
            disabled={apiStatus !== 'connected' || emergencyPending}
          >
            {emergencyPending ? 'SENDING...' : 'EMERGENCY STOP'}
          </button>
          {emergencyMessage && (
            <p className="command-message" role="status">
              {emergencyMessage}
            </p>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
