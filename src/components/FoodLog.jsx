import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function FoodLog({ userId }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState(null)
  const [grams, setGrams] = useState(100)
  const [foodLog, setFoodLog] = useState([])
  const debounceRef = useRef(null)
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => { fetchToday() }, [])

  async function fetchToday() {
    const { data } = await supabase
      .from('food_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('logged_date', today)
      .order('created_at', { ascending: false })
    setFoodLog(data || [])
  }

  function handleSearch(val) {
    setQuery(val)
    setSelected(null)
    clearTimeout(debounceRef.current)
    if (val.length < 2) { setResults([]); return }
    debounceRef.current = setTimeout(() => searchFood(val), 450)
  }

async function searchFood(q) {
    setSearching(true)
    try {
      const key = import.meta.env.VITE_USDA_API_KEY
      const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(q)}&pageSize=10&api_key=${key}`)
      const data = await res.json()
      const filtered = (data.foods || [])
        .filter(f => f.foodNutrients?.length > 0)
        .slice(0, 8)
        .map(f => {
          const get = (name) => {
            const n = f.foodNutrients.find(n => n.nutrientName === name)
            return n?.value || 0
          }
          return {
            product_name: f.description,
            brands: f.brandOwner || f.dataType || '',
            nutriments: {
              'energy-kcal_100g': get('Energy'),
              'proteins_100g': get('Protein'),
              'carbohydrates_100g': get('Carbohydrate, by difference'),
              'fat_100g': get('Total lipid (fat)')
            }
          }
        })
      setResults(filtered)
    } catch { setResults([]) }
    setSearching(false)
  }

  function selectFood(food) {
    setSelected(food)
    setGrams(100)
    setResults([])
    setQuery(food.product_name)
  }

  function getNutrition(food, g) {
    const f = g / 100
    const n = food.nutriments
    return {
      calories: Math.round((n['energy-kcal_100g'] || 0) * f),
      protein: Math.round((n['proteins_100g'] || 0) * f * 10) / 10,
      carbs: Math.round((n['carbohydrates_100g'] || 0) * f * 10) / 10,
      fat: Math.round((n['fat_100g'] || 0) * f * 10) / 10,
    }
  }

  async function addFood() {
    if (!selected) return
    const nutrition = getNutrition(selected, grams)
    const entry = {
      user_id: userId,
      logged_date: today,
      food_name: selected.product_name,
      serving_grams: grams,
      ...nutrition
    }
    const { data } = await supabase.from('food_logs').insert(entry).select().single()
    if (data) setFoodLog(prev => [data, ...prev])
    setSelected(null)
    setQuery('')
    setResults([])
  }

  async function removeFood(id) {
    await supabase.from('food_logs').delete().eq('id', id)
    setFoodLog(prev => prev.filter(f => f.id !== id))
  }

  const preview = selected ? getNutrition(selected, grams) : null

  return (
    <div>
      <div className="page-header">
        <h2>🍽️ Log food</h2>
        <p>Search from millions of foods</p>
      </div>

      <div className="search-bar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          placeholder="Search foods, e.g. chicken breast..."
          value={query}
          onChange={e => handleSearch(e.target.value)}
        />
        {searching && <span className="spinner" />}
      </div>

      {results.length > 0 && (
        <div className="search-results">
          {results.map((food, i) => {
            const cals = Math.round(food.nutriments['energy-kcal_100g'])
            return (
              <div key={i} className="search-result-item" onClick={() => selectFood(food)}>
                <div>
                  <div className="result-name">{food.product_name}</div>
                  <div className="result-meta">{food.brands ? food.brands.split(',')[0] : 'Generic'}</div>
                </div>
                <span className="result-cals">{cals} kcal/100g</span>
              </div>
            )
          })}
        </div>
      )}

      {selected && (
        <div className="serving-modal">
          <h3>{selected.product_name}</h3>
          <div className="serving-row">
            <input
              type="number"
              value={grams}
              min="1"
              max="2000"
              onChange={e => setGrams(Number(e.target.value))}
            />
            <span>grams</span>
          </div>
          {preview && (
            <div className="nutrition-preview">
              <span className="nutrition-pill pill-cals">{preview.calories} kcal</span>
              <span className="nutrition-pill pill-protein">P: {preview.protein}g</span>
              <span className="nutrition-pill pill-carbs">C: {preview.carbs}g</span>
              <span className="nutrition-pill pill-fat">F: {preview.fat}g</span>
            </div>
          )}
          <div className="serving-btns">
            <button className="btn-add" onClick={addFood}>Add to log</button>
            <button className="btn-cancel" onClick={() => { setSelected(null); setQuery('') }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title">Today's log</div>
        {foodLog.length === 0 && (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 3h18M3 9h18M3 15h18M3 21h18" />
            </svg>
            <p>No food logged yet today</p>
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