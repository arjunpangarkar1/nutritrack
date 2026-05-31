import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function WeightLog({ userId }) {
  const [weightValue, setWeightValue] = useState('')
  const [unit, setUnit] = useState('lbs')
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => { fetchLogs() }, [])

  async function fetchLogs() {
    const { data } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', userId)
      .order('logged_date', { ascending: true })
    setLogs(data || [])
    setLoading(false)
  }

  async function logWeight() {
    if (!weightValue || isNaN(weightValue)) return
    const entry = {
      user_id: userId,
      logged_date: today,
      weight_value: parseFloat(weightValue),
      weight_unit: unit
    }
    const existing = logs.find(l => l.logged_date === today)
    if (existing) {
      const { data } = await supabase
        .from('weight_logs')
        .update({ weight_value: parseFloat(weightValue), weight_unit: unit })
        .eq('id', existing.id)
        .select().single()
      if (data) setLogs(prev => prev.map(l => l.id === existing.id ? data : l))
    } else {
      const { data } = await supabase
        .from('weight_logs')
        .insert(entry).select().single()
      if (data) setLogs(prev => [...prev, data].sort((a, b) => a.logged_date.localeCompare(b.logged_date)))
    }
    setWeightValue('')
  }

  function formatDate(dateStr) {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  function getTrend(current, previous) {
    if (!previous) return null
    const diff = current - previous
    if (Math.abs(diff) < 0.1) return { label: '→', className: 'trend-same' }
    return diff > 0
      ? { label: `+${diff.toFixed(1)}`, className: 'trend-up' }
      : { label: diff.toFixed(1), className: 'trend-down' }
  }

  const chartData = logs.slice(-30).map(l => ({
    date: formatDate(l.logged_date),
    weight: l.weight_value
  }))

  const recent = [...logs].reverse().slice(0, 10)

  return (
    <div>
      <div className="page-header">
        <h2>⚖️ Weight</h2>
        <p>Track your body weight over time</p>
      </div>

      <div className="weight-input-card">
        <div className="card-title">Log today's weight</div>
        <div className="weight-input-row">
          <input
            type="number"
            placeholder="0.0"
            value={weightValue}
            step="0.1"
            onChange={e => setWeightValue(e.target.value)}
          />
          <select value={unit} onChange={e => setUnit(e.target.value)}>
            <option value="lbs">lbs</option>
            <option value="kg">kg</option>
          </select>
          <button className="btn-log" onClick={logWeight}>Save</button>
        </div>
      </div>

      {logs.length >= 2 && (
        <div className="card">
          <div className="card-title">Weight trend</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
              <Tooltip formatter={(val) => [`${val} ${unit}`, 'Weight']} />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#FF6B35"
                strokeWidth={2.5}
                dot={{ fill: '#FF6B35', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card">
        <div className="card-title">History</div>
        {loading && <div className="empty-state"><p>Loading...</p></div>}
        {!loading && logs.length === 0 && (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
            <p>No weight entries yet. Log your first one above!</p>
          </div>
        )}
        {recent.map((log, i) => {
          const prev = recent[i + 1]
          const trend = getTrend(log.weight_value, prev?.weight_value)
          return (
            <div key={log.id} className="weight-history-item">
              <span className="weight-date">{formatDate(log.logged_date)}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {trend && <span className={`weight-trend ${trend.className}`}>{trend.label}</span>}
                <span className="weight-value">{log.weight_value} {log.weight_unit}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}