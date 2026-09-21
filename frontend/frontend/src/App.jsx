import { useState } from 'react'

function StatusLine({ icon, children }) {
  return (
    <div className="status-line">
      <span className="status-line-icon">{icon}</span>
      <span>{children}</span>
    </div>
  )
}

function Card({ title, status, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      <div className="card-title-row">
        <h2>{title}</h2>
        {status && (
          <span className="card-status">
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
              <StatusLine icon="⌁">Wifi: Connected</StatusLine>
              <StatusLine icon="▧">MQTT: Connected</StatusLine>
              <StatusLine icon="▣">Mode: Manual</StatusLine>
              <StatusLine icon="♢">Status: Idle</StatusLine>
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

          <Card title="Data Collection" className="collection-card">
            <p>Start logging temperature, pressure, and condensation readings.</p>
            <button className="primary-button" onClick={() => setCollecting((value) => !value)}>
              {collecting ? 'STOP DATA COLLECTION' : 'START DATA COLLECTION'}
            </button>
          </Card>
        </div>

        <div className="dashboard-column center-column">
          <Card title="Temperature" status="normal" className="temperature-card">
            <div className="temperature-values">
              <div><span>INNER TEMP</span><strong>XX.X °F</strong></div>
              <div><span>OUTER TEMP</span><strong>XX.X °F</strong></div>
            </div>
          </Card>

          <Card title="Pressure" status="normal">
            <div className="reading">XX.X <small>psi</small></div>
            <p className="limit">Safety Limit: XXX.X psi</p>
          </Card>

          <Card title="Condensation" status="normal" className="condensation-card">
            <div className="reading">XX <small>kPa</small></div>
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
