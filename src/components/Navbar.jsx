import { Home, Search, Scale, TrendingUp } from 'lucide-react'

export default function Navbar({ activePage, setActivePage }) {
  const items = [
    { id: 'dashboard', label: 'Today', icon: Home },
    { id: 'food', label: 'Log food', icon: Search },
    { id: 'weight', label: 'Weight', icon: Scale },
    { id: 'progress', label: 'Progress', icon: TrendingUp },
  ]

  return (
    <nav className="navbar">
      {items.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={`nav-item ${activePage === id ? 'active' : ''}`}
          onClick={() => setActivePage(id)}
        >
          <Icon />
          {label}
        </button>
      ))}
    </nav>
  )
}