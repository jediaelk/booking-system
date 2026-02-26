import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard, CheckCircle2, CalendarDays,
  ClockIcon, Car, Menu, X,
} from 'lucide-react'
import { getStats } from './api'
import type { Page } from './types'

import Dashboard     from './pages/Dashboard'
import BookingForm   from './pages/BookingForm'
import Approvals     from './pages/Approvals'
import CalendarView  from './pages/CalendarView'
import History       from './pages/History'
import Fleet         from './pages/Fleet'
import PublicBooking from './pages/PublicBooking'

const NAV: { id: Page; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'approvals', label: 'Approvals', icon: CheckCircle2    },
  { id: 'calendar',  label: 'Calendar',  icon: CalendarDays    },
  { id: 'history',   label: 'History',   icon: ClockIcon       },
  { id: 'fleet',     label: 'Fleet',     icon: Car             },
]

function AdminApp() {
  // All hooks must be at the top — no hooks after conditional returns
  const [authed, setAuthed]       = useState(() => sessionStorage.getItem('admin_auth') === '1')
  const [page, setPage]           = useState<Page>('dashboard')
  const [sidebarOpen, setSidebar] = useState(false)
  const { data: stats }           = useQuery({ queryKey: ['stats'], queryFn: getStats, refetchInterval: 30_000, enabled: authed })

  const navigate = (p: Page) => { setPage(p); setSidebar(false) }

  if (!authed) return <Login onLogin={() => setAuthed(true)} />

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setSidebar(false)} />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200
        flex flex-col transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <span className="text-base font-bold tracking-tight">Refine Chauffeur</span>
            <span className="ml-1 text-xs font-medium text-gray-400 uppercase tracking-widest">Admin</span>
          </div>
          <button className="lg:hidden text-gray-400 hover:text-gray-600" onClick={() => setSidebar(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ id, label, icon: Icon }) => {
            const active = page === id
            const badge  = id === 'approvals' && stats?.pending ? stats.pending : null
            return (
              <button
                key={id}
                onClick={() => navigate(id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${active ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
                `}
              >
                <Icon size={16} />
                <span className="flex-1 text-left">{label}</span>
                {badge && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${active ? 'bg-white text-black' : 'bg-amber-100 text-amber-800'}`}>
                    {badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="px-6 py-4 border-t border-gray-100 space-y-2">
          <p className="text-xs text-gray-400">10 vehicles · 2 tiers</p>
          <button
            onClick={() => { sessionStorage.removeItem('admin_auth'); setAuthed(false) }}
            className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
          <button onClick={() => setSidebar(true)} className="text-gray-600"><Menu size={20} /></button>
          <span className="font-semibold text-sm">{NAV.find(n => n.id === page)?.label}</span>
        </header>

        <main className="flex-1 overflow-auto">
          {page === 'dashboard' && <Dashboard onNavigate={navigate} />}
          {page === 'booking'   && <BookingForm />}
          {page === 'approvals' && <Approvals />}
          {page === 'calendar'  && <CalendarView />}
          {page === 'history'   && <History />}
          {page === 'fleet'     && <Fleet />}
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/book"  element={<PublicBooking />} />
      <Route path="/admin" element={<AdminApp />} />
      <Route path="*"      element={<Navigate to="/book" replace />} />
    </Routes>
  )
}
