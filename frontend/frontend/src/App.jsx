import { useEffect, useState } from 'react'
import mqtt from 'mqtt'

const brokerUrl = import.meta.env.VITE_MQTT_URL?.trim()
const telemetryTopic = import.meta.env.VITE_MQTT_TOPIC?.trim() || 'steam-sensor/telemetry'
const telemetryFields = [
  'inner_temperature_f',
  'outer_temperature_f',
  'pressure_psi',
  'condensation_kpa',
]

function formatReading(value, digits = 1) {
  return typeof value === 'number' ? value.toFixed(digits) : '--'
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
  const [actuatorPosition, setActuatorPosition] = useState(50)
  const [note, setNote] = useState('')
  const [logs, setLogs] = useState([])
  const [collecting, setCollecting] = useState(false)
  const [mqttStatus, setMqttStatus] = useState(brokerUrl ? 'connecting' : 'not-configured')
  const [mqttError, setMqttError] = useState('')
  const [telemetry, setTelemetry] = useState(null)

  useEffect(() => {
    if (!brokerUrl) return undefined

    const client = mqtt.connect(brokerUrl, {
      reconnectPeriod: 2000,
      connectTimeout: 10000,
    })

    client.on('connect', () => {
      setMqttStatus('connected')
      setMqttError('')
      client.subscribe(telemetryTopic, (error) => {
        if (error) setMqttError(`Could not subscribe to ${telemetryTopic}: ${error.message}`)
      })
    })
    client.on('reconnect', () => setMqttStatus('reconnecting'))
    client.on('close', () => setMqttStatus('disconnected'))
    client.on('error', (error) => setMqttError(`MQTT connection error: ${error.message}`))
    client.on('message', (topic, message) => {
      if (topic !== telemetryTopic) return

      try {
        const payload = JSON.parse(message.toString())
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
          throw new Error('Expected a JSON object.')
        }

        const readings = Object.fromEntries(
          telemetryFields
            .filter((field) => Number.isFinite(payload[field]))
            .map((field) => [field, payload[field]]),
        )
        if (Object.keys(readings).length === 0) {
          throw new Error(`Expected at least one numeric field: ${telemetryFields.join(', ')}.`)
        }

        setTelemetry({
          ...readings,
          mode: typeof payload.mode === 'string' ? payload.mode : null,
          systemStatus: typeof payload.system_status === 'string' ? payload.system_status : null,
          receivedAt: Date.now(),
        })
        setMqttError('')
      } catch (error) {
        setMqttError(`Invalid telemetry on ${telemetryTopic}: ${error.message}`)
      }
    })

    return () => client.end(true)
  }, [])

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
        <div className="dashboard-column left-column">
          <Card title="System Status">
            <div className="status-list">
              <StatusLine icon="▧">MQTT: {mqttStatus.replace('-', ' ')}</StatusLine>
              <StatusLine icon="▣">Mode: {telemetry?.mode ?? '—'}</StatusLine>
              <StatusLine icon="♢">Status: {telemetry?.systemStatus ?? '—'}</StatusLine>
              <StatusLine icon="◷">
                Last update: {telemetry ? new Date(telemetry.receivedAt).toLocaleTimeString() : 'Waiting for telemetry'}
              </StatusLine>
            </div>
            {mqttError && <p className="connection-error" role="alert">{mqttError}</p>}
            {!brokerUrl && (
              <p className="connection-help">
                Set VITE_MQTT_URL to your broker&apos;s WebSocket address to connect.
              </p>
            )}
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

          <Card title="Data Collection" className="collection-card">
            <p>Start logging temperature, pressure, and condensation readings.</p>
            <button className="primary-button" onClick={() => setCollecting((value) => !value)}>
              {collecting ? 'STOP DATA COLLECTION' : 'START DATA COLLECTION'}
            </button>
          </Card>
        </div>

        <div className="dashboard-column center-column">
          <Card
            title="Temperature"
            status={telemetry ? 'live' : 'waiting'}
            statusTone={telemetry ? 'connected' : ''}
            className="temperature-card"
          >
            <div className="temperature-values">
              <div><span>INNER TEMP</span><strong>{formatReading(telemetry?.inner_temperature_f)} °F</strong></div>
              <div><span>OUTER TEMP</span><strong>{formatReading(telemetry?.outer_temperature_f)} °F</strong></div>
            </div>
          </Card>

          <Card title="Pressure" status={telemetry ? 'live' : 'waiting'} statusTone={telemetry ? 'connected' : ''}>
            <div className="reading">{formatReading(telemetry?.pressure_psi)} <small>psi</small></div>
            <p className="limit">Safety Limit: XXX.X psi</p>
          </Card>

          <Card
            title="Condensation"
            status={telemetry ? 'live' : 'waiting'}
            statusTone={telemetry ? 'connected' : ''}
            className="condensation-card"
          >
            <div className="reading">{formatReading(telemetry?.condensation_kpa, 0)} <small>kPa</small></div>
            <p className="limit">Max Allowable: XXX kPa</p>
          </Card>
        </div>

        <div className="dashboard-column right-column">
          <Card title="Actuator Position Target" className="actuator-card">
            <div className="actuator-control">
              <button aria-label="Decrease actuator position" onClick={() => setActuatorPosition((value) => Math.max(0, value - 5))}>◀</button>
              <div className="actuator-reading">
                <strong>{actuatorPosition}%</strong>
                <span>ACTUAL: XX%</span>
              </div>
              <button aria-label="Increase actuator position" onClick={() => setActuatorPosition((value) => Math.min(100, value + 5))}>▶</button>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={actuatorPosition}
              onChange={(event) => setActuatorPosition(Number(event.target.value))}
              aria-label="Actuator position target"
            />
          </Card>

          <Card title="History" className="history-card">
            <svg viewBox="0 0 300 115" preserveAspectRatio="none" role="img" aria-label="Sensor history">
              <line x1="5" y1="102" x2="295" y2="102" />
              <line x1="5" y1="10" x2="5" y2="102" />
              <path d="M7 88 C25 72, 29 40, 52 35 C80 29, 75 85, 103 80 C132 75, 128 36, 150 30 C176 23, 168 82, 195 80 C226 78, 211 15, 240 9 C273 2, 262 85, 291 87" />
            </svg>
          </Card>

          <section className="emergency-card">
            <h2>Emergency Control</h2>
            <button className="emergency-button" onClick={() => window.alert('Emergency stop requested.')}>EMERGENCY STOP</button>
          </section>
        </div>
      </main>
    </div>
  )
}

export default App
