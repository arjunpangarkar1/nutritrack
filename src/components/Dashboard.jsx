import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function calcGoalCals(profile) {
  if (profile.custom_calories) return profile.custom_calories
  const weightKg = profile.weight_lbs * 0.453592
  const bmr = profile.sex === 'male'
    ? 10 * weightKg + 6.25 * profile.height_cm - 5 * profile.age + 5
    : 10 * weightKg + 6.25 * profile.height_cm - 5 * profile.age - 161
  return Math.round(bmr * profile.activity_level + profile.goal_adjustment)
}

function CalorieRing({ eaten, goal }) {
  const pct = Math.min(eaten / goal, 1)
  const r = 54
  const circ = 2 * Math.PI * r
  const dash = pct * circ
  const color = pct > 1 ? '#EB5757' : pct > 0.85 ? '#F2994A' : '#FF6B35'

  return (
    <div className="ring-container">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#F3F4F6" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="ring-center">
        <div className="ring-calories">{Math.round(eaten)}</div>
        <div className="ring-label">of {goal}</div>
      </div>
    </div>
  )
}

function MacroBar({ label, eaten, goal, color }) {
  const pct = Math.min((eaten / goal) * 100, 100)
  return (
    <div className="macro-bar-row">
      <div className="macro-bar-header">
        <span className="macro-bar-name" style={{ color }}>{label}</span>
        <span className="macro-bar-values">{Math.round(eaten)}g / {goal}g</span>
      </div>
      <div className="macro-bar-track">
        <div className="macro-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export default function Dashboard({ profile, userId }) {
  const [foodLog, setFoodLog] = useState([])
  const [loading, setLoading] = useState(true)
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    fetchToday()
  }, [])

  async function fetchToday() {
    const { data } = await supabase
      .from('food_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('logged_date', today)
      .order('created_at', { ascending: false })
    setFoodLog(data || [])
    setLoading(false)
  }

  async function removeFood(id) {
    await supabase.from('food_logs').delete().eq('id', id)
    setFoodLog(prev => prev.filter(f => f.id !== id))
  }

  const goalCals = calcGoalCals(profile)
  const macros = {
    protein: Math.round(goalCals * 0.25 / 4),
    carbs: Math.round(goalCals * 0.45 / 4),
    fat: Math.round(goalCals * 0.30 / 9)
  }

  const totals = foodLog.reduce((acc, item) => ({
    calories: acc.calories + item.calories,
    protein: acc.protein + item.protein,
    carbs: acc.carbs + item.carbs,
    fat: acc.fat + item.fat
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

  const remaining = goalCals - totals.calories
  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div>
      <div className="page-header">
        <h2>🔥 Today</h2>
        <p>{dateLabel}</p>
      </div>

      <div className="card">
        <div className="card-title">Calories</div>
        <div className="calorie-ring-wrap">
          <CalorieRing eaten={totals.calories} goal={goalCals} />
          <div className="calorie-stats">
            <div className="cal-stat">
              <span className="cal-stat-label">Goal</span>
              <span className="cal-stat-value">{goalCals}</span>
            </div>
            <div className="cal-stat">
              <span className="cal-stat-label">Eaten</span>
              <span className="cal-stat-value" style={{ color: 'var(--primary)' }}>{Math.round(totals.calories)}</span>
            </div>
            <div className="cal-stat">
              <span className="cal-stat-label">{remaining >= 0 ? 'Remaining' : 'Over by'}</span>
              <span className="cal-stat-value" style={{ color: remaining < 0 ? 'var(--danger)' : 'var(--success)' }}>
                {Math.abs(Math.round(remaining))}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Macros</div>
        <div className="macro-bars">
          <MacroBar label="Protein" eaten={totals.protein} goal={macros.protein} color="var(--protein-color)" />
          <MacroBar label="Carbs" eaten={totals.carbs} goal={macros.carbs} color="var(--carbs-color)" />
          <MacroBar label="Fat" eaten={totals.fat} goal={macros.fat} color="var(--fat-color)" />
        </div>
      </div>

      <div className="card">
        <div className="card-title">Food log</div>
        {loading && <div className="empty-state"><p>Loading...</p></div>}
        {!loading && foodLog.length === 0 && (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3h18M3 9h18M3 15h18M3 21h18" /></svg>
            <p>Nothing logged yet — tap Log food to get started</p>
          </div>
        )}
        {foodLog.map(item => (
          <div key={item.id} className="food-log-item">
            <div>
              <div className="food-log-name">{item.food_name}</div>
              <div className="food-log-meta">{item.serving_grams}g · P: {Math.round(item.protein)}g · C: {Math.round(item.carbs)}g · F: {Math.round(item.fat)}g</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span className="food-log-cals">{Math.round(item.calories)}</span>
              <button className="remove-btn" onClick={() => removeFood(item.id)}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}