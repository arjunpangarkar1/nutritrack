import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import Onboarding from './components/Onboarding'
import Dashboard from './components/Dashboard'
import FoodLog from './components/FoodLog'
import WeightLog from './components/WeightLog'
import Progress from './components/Progress'
import Navbar from './components/Navbar'
import './index.css'

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [activePage, setActivePage] = useState('dashboard')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data)
    setLoading(false)
  }

  if (loading) return (
    <div className="loading-screen">
      <div className="loading-spinner"></div>
    </div>
  )

  if (!session) return <Auth />

  if (!profile) return <Onboarding onComplete={(p) => setProfile(p)} userId={session.user.id} />

  const pages = { dashboard: Dashboard, food: FoodLog, weight: WeightLog, progress: Progress }
  const PageComponent = pages[activePage] || Dashboard

  return (
    <div className="app-container">
      <PageComponent profile={profile} userId={session.user.id} />
      <Navbar activePage={activePage} setActivePage={setActivePage} />
    </div>
  )
}