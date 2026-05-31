import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, PieChart, Pie, Cell, Legend
} from 'recharts'

function calcGoalCals(profile) {
  if (profile.custom_calories) return profile.custom_calories
  const weightKg = profile.weight_lbs * 0.453592
  const bmr = profile.sex === 'male'
    ? 10 * weightKg + 6.25 * profile.height_cm - 5 * profile.age + 5
    : 10 * weightKg + 6.25 * profile.height_cm - 5 * profile.age - 161
  return Math.round(bmr * profile.activity_level + profile.goal_adjustment)
}

function getAdaptiveTDEE(weightLogs, foodLogs) {
  if (weightLogs.length < 2) return null
  const sorted = [...weightLogs].sort((a, b) => a.logged_date.localeCompare(b.logged_date))
  const recent = sorted.slice(-14)
  if (recent.length < 2) return null
  const firstWeight = recent[0].weight_value
  const lastWeight = recent[recent.length - 1].weight_value
  const weightChangeLbs = lastWeight - firstWeight
  const weightChangeKcal = weightChangeLbs * 3500
  const days = recent.length
  const avgCals = foodLogs.length > 0
    ? foodLogs.reduce((s, l) => s + l.calories, 0) / Math.max(foodLogs.length, 1)
    : 0
  if (avgCals === 0) return null
  const estimatedTDEE = Math.round(avgCals - (weightChangeKcal / days))
  return estimatedTDEE
}

export default function Progress({ profile, userId }) {
  const [foodLogs, setFoodLogs] = useState([])
  const [weightLogs, setWeightLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const cutoff = thirtyDaysAgo.toISOString().split('T')[0]

    const [{ data: food }, { data: weight }] = await Promise.all([
      supabase.from('food_logs').select('*').eq('user_id', userId).gte('logged_date', cutoff),
      supabase.from('weight_logs').select('*').eq('user_id', userId).gte('logged_date', cutoff)
    ])
    setFoodLogs(food || [])
    setWeightLogs(weight || [])
    setLoading(false)
  }

  const goalCals = calcGoalCals(profile)
  const adaptiveTDEE = getAdaptiveTDEE(weightLogs, foodLogs)
  const macros = {
    protein: Math.round(goalCals * 0.25 / 4),
    carbs: Math.round(goalCals * 0.45 / 4),
    fat: Math.round(goalCals * 0.30 / 9)
  }

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const key = d.toISOString().split('T')[0]
    const dayFoods = foodLogs.filter(f => f.logged_date === key)
    const cals = Math.round(dayFoods.reduce((s, f) => s + f.calories, 0))
    return {
      date: d.toLocaleDateString('en-US', { weekday: 'short' }),
      calories: cals,
      isToday: key === today
    }
  })

  const todayFoods = foodLogs.filter(f => f.logged_date === today)
  const todayTotals = todayFoods.reduce((acc, f) => ({
    protein: acc.protein + f.protein,
    carbs: acc.carbs + f.carbs,
    fat: acc.fat + f.fat
  }), { protein: 0, carbs: 0, fat: 0 })

  const pieData = [
    { name: 'Protein', value: Math.round(todayTotals.protein * 4), color: '#27AE60' },
    { name: 'Carbs', value: Math.round(todayTotals.carbs * 4), color: '#2D9CDB' },
    { name: 'Fat', value: Math.round(todayTotals.fat * 9), color: '#F2994A' }
  ].filter(d => d.value > 0)

  const avgCals7 = Math.round(
    last7Days.reduce((s, d) => s + d.calories, 0) /
    Math.max(last7Days.filter(d => d.calories > 0).length, 1)
  )

  if (loading) return <div className="loading-screen"><div className="loading-spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <h2>📈 Progress</h2>
        <p>Your stats and smart recommendations</p>
      </div>

      {adaptiveTDEE && (
        <div className="algo-banner">
          <h3>🧠 Smart calorie estimate</h3>
          <p>
            Based on your actual weight trend and food logs, your real TDEE is estimated at{' '}
            <strong>{adaptiveTDEE} kcal/day</strong>.
            {adaptiveTDEE > goalCals + 100 && ' You may be burning more than expected — consider eating a bit more.'}
            {adaptiveTDEE < goalCals - 100 && ' Your metabolism may be lower than estimated — your current target looks good.'}
            {Math.abs(adaptiveTDEE - goalCals) <= 100 && ' Your target is well-calibrated to your body.'}
          </p>
        </div>
      )}

      <div className="card">
        <div className="card-title">Your targets</div>
        <div className="reco-grid">
          <div className="reco-card" style={{ gridColumn: 'span 2', background: '#FFF5F2', border: '2px solid var(--primary)' }}>
            <div className="reco-card-label">Daily calorie goal</div>
            <div className="reco-card-value" style={{ fontSize: '28px', color: 'var(--primary)' }}>{goalCals} kcal</div>
          </div>
          <div className="reco-card">
            <div className="reco-card-label">7-day avg</div>
            <div className="reco-card-value" style={{ color: avgCals7 > goalCals ? 'var(--danger)' : 'var(--success)' }}>{avgCals7}</div>
            <div className="reco-card-note">kcal/day</div>
          </div>
          <div className="reco-card">
            <div className="reco-card-label">Adaptive TDEE</div>
            <div className="reco-card-value" style={{ color: 'var(--secondary)' }}>{adaptiveTDEE || '—'}</div>
            <div className="reco-card-note">{adaptiveTDEE ? 'kcal/day' : 'Need more data'}</div>
          </div>
          <div className="reco-card">
            <div className="reco-card-label">Protein target</div>
            <div className="reco-card-value" style={{ color: 'var(--success)' }}>{macros.protein}g</div>
          </div>
          <div className="reco-card">
            <div className="reco-card-label">Carbs target</div>
            <div className="reco-card-value" style={{ color: 'var(--secondary)' }}>{macros.carbs}g</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Calories — last 7 days</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={last7Days} barSize={32}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} />
            <Tooltip formatter={(val) => [`${val} kcal`, 'Calories']} />
            <ReferenceLine y={goalCals} stroke="#FF6B35" strokeDasharray="4 4" label={{ value: 'Goal', position: 'right', fontSize: 11, fill: '#FF6B35' }} />
            <Bar dataKey="calories" radius={[6, 6, 0, 0]}>
              {last7Days.map((entry, i) => (
                <Cell key={i} fill={entry.calories > goalCals ? '#EB5757' : entry.calories > 0 ? '#FF6B35' : '#E5E7EB'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {pieData.length > 0 && (
        <div className="card">
          <div className="card-title">Today's macro split</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(val) => [`${val} kcal`]} />
              <Legend iconType="circle" iconSize={10} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}