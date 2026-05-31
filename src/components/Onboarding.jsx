import { useState } from 'react'
import { supabase } from '../lib/supabase'

function calcGoalCals(data) {
  const weightKg = data.weight_lbs * 0.453592
  const bmr = data.sex === 'male'
    ? 10 * weightKg + 6.25 * data.height_cm - 5 * data.age + 5
    : 10 * weightKg + 6.25 * data.height_cm - 5 * data.age - 161
  const tdee = bmr * data.activity_level
  return Math.round(tdee + data.goal_adjustment)
}

export default function Onboarding({ onComplete, userId }) {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    age: '', sex: 'male', height_cm: '', weight_lbs: '',
    activity_level: 1.55, goal_adjustment: 0
  })

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function finish() {
    setLoading(true)
    setError('')
    const profileData = {
      id: userId,
      age: parseInt(form.age),
      sex: form.sex,
      height_cm: parseFloat(form.height_cm),
      weight_lbs: parseFloat(form.weight_lbs),
      activity_level: parseFloat(form.activity_level),
      goal_adjustment: parseInt(form.goal_adjustment),
      custom_calories: null
    }
    const { error } = await supabase.from('profiles').insert(profileData)
    if (error) { setError(error.message); setLoading(false); return }
    onComplete(profileData)
  }

  const steps = [
    {
      title: "Let's get started",
      subtitle: "Tell us a bit about yourself",
      content: (
        <>
          <div className="input-row-2">
            <div className="form-group">
              <label>Age</label>
              <input type="number" placeholder="25" value={form.age} onChange={e => set('age', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Sex</label>
              <select value={form.sex} onChange={e => set('sex', e.target.value)}>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>
          <div className="input-row-2">
            <div className="form-group">
              <label>Height (cm)</label>
              <input type="number" placeholder="175" value={form.height_cm} onChange={e => set('height_cm', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Weight (lbs)</label>
              <input type="number" placeholder="165" value={form.weight_lbs} onChange={e => set('weight_lbs', e.target.value)} />
            </div>
          </div>
        </>
      )
    },
    {
      title: 'Activity level',
      subtitle: 'How active are you on a typical week?',
      content: (
        <div className="form-group">
          <select value={form.activity_level} onChange={e => set('activity_level', e.target.value)} style={{ fontSize: '15px', padding: '14px' }}>
            <option value={1.2}>Sedentary — desk job, little exercise</option>
            <option value={1.375}>Lightly active — 1-3 days/week</option>
            <option value={1.55}>Moderately active — 3-5 days/week</option>
            <option value={1.725}>Very active — 6-7 days/week</option>
            <option value={1.9}>Athlete — physical job or 2x/day training</option>
          </select>
        </div>
      )
    },
    {
      title: 'Your goal',
      subtitle: 'What are you working towards?',
      content: (
        <div className="form-group">
          <select value={form.goal_adjustment} onChange={e => set('goal_adjustment', e.target.value)} style={{ fontSize: '15px', padding: '14px' }}>
            <option value={-500}>Lose weight — 0.5 kg/week</option>
            <option value={-250}>Lose slowly — 0.25 kg/week</option>
            <option value={0}>Maintain weight</option>
            <option value={250}>Gain slowly — 0.25 kg/week</option>
            <option value={500}>Gain weight — 0.5 kg/week</option>
          </select>
        </div>
      )
    },
    {
      title: 'Your targets',
      subtitle: 'Based on your stats, here are your daily targets',
      content: (() => {
        const cals = calcGoalCals({ ...form, age: parseInt(form.age), height_cm: parseFloat(form.height_cm), weight_lbs: parseFloat(form.weight_lbs), activity_level: parseFloat(form.activity_level), goal_adjustment: parseInt(form.goal_adjustment) })
        const protein = Math.round(cals * 0.25 / 4)
        const carbs = Math.round(cals * 0.45 / 4)
        const fat = Math.round(cals * 0.30 / 9)
        return (
          <div className="reco-grid">
            <div className="reco-card" style={{ gridColumn: 'span 2', background: '#FFF5F2', border: '2px solid var(--primary)' }}>
              <div className="reco-card-label">Daily calorie target</div>
              <div className="reco-card-value" style={{ fontSize: '32px', color: 'var(--primary)' }}>{cals} kcal</div>
            </div>
            <div className="reco-card">
              <div className="reco-card-label">Protein</div>
              <div className="reco-card-value" style={{ color: 'var(--success)' }}>{protein}g</div>
            </div>
            <div className="reco-card">
              <div className="reco-card-label">Carbs</div>
              <div className="reco-card-value" style={{ color: 'var(--secondary)' }}>{carbs}g</div>
            </div>
            <div className="reco-card" style={{ gridColumn: 'span 2' }}>
              <div className="reco-card-label">Fat</div>
              <div className="reco-card-value" style={{ color: 'var(--warning)' }}>{fat}g</div>
              <div className="reco-card-note" style={{ marginTop: '8px' }}>These are calculated using the Mifflin-St Jeor formula — the gold standard used by nutrition professionals.</div>
            </div>
          </div>
        )
      })()
    }
  ]

  const current = steps[step]
  const isLast = step === steps.length - 1

  return (
    <div className="onboarding-container">
      <div className="step-indicator">
        {steps.map((_, i) => <div key={i} className={`step-dot ${i <= step ? 'active' : ''}`} />)}
      </div>
      <div className="onboarding-header">
        <h1>{current.title}</h1>
        <p>{current.subtitle}</p>
      </div>
      {error && <div className="error-msg">{error}</div>}
      {current.content}
      <div style={{ marginTop: '2rem', display: 'flex', gap: '10px' }}>
        {step > 0 && (
          <button className="btn-secondary" onClick={() => setStep(s => s - 1)} style={{ width: 'auto', padding: '14px 24px' }}>
            Back
          </button>
        )}
        <button className="btn-primary" onClick={isLast ? finish : () => setStep(s => s + 1)} disabled={loading}>
          {loading ? 'Saving...' : isLast ? "Let's go! 🚀" : 'Continue'}
        </button>
      </div>
    </div>
  )
}