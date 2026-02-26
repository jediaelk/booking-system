import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Clock, CheckCircle2, XCircle, CalendarCheck } from 'lucide-react'
import { getStats, getBookings, getDailyStats } from '../api'
import { STATUS_CONFIG, TIER_CONFIG, formatDate, timeAgo, getSlotInfo } from '../utils'
import type { Page } from '../types'

interface Props { onNavigate: (p: Page) => void }

function StatCard({ label, value, icon: Icon, sub }: { label: string; value: number | string; icon: React.ElementType; sub?: string }) {
  return (
    <div className="card p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-3xl font-bold mt-1 text-gray-900">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
          <Icon size={18} className="text-gray-600" />
        </div>
      </div>
    </div>
  )
}

function LineGraph({ data }: { data: { date: string; count: number }[] }) {
  if (!data.length) return null

  const W = 400
  const H = 80
  const PAD = { top: 8, right: 8, bottom: 20, left: 24 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const max = Math.max(...data.map(d => d.count), 1)
  const points = data.map((d, i) => ({
    x: PAD.left + (i / (data.length - 1)) * innerW,
    y: PAD.top + innerH - (d.count / max) * innerH,
    ...d,
  }))

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')

  const areaD =
    `M ${points[0].x.toFixed(1)} ${(PAD.top + innerH).toFixed(1)} ` +
    points.map(p => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') +
    ` L ${points[points.length - 1].x.toFixed(1)} ${(PAD.top + innerH).toFixed(1)} Z`

  // Show every ~7th label
  const labelEvery = Math.ceil(data.length / 5)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 80 }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#000" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#000" stopOpacity="0"    />
        </linearGradient>
      </defs>

      {/* Horizontal grid lines */}
      {[0, 0.5, 1].map(t => {
        const y = PAD.top + innerH * (1 - t)
        return (
          <line
            key={t}
            x1={PAD.left} y1={y} x2={PAD.left + innerW} y2={y}
            stroke="#e5e7eb" strokeWidth="1"
          />
        )
      })}

      {/* Y axis labels */}
      {[0, max].map((v, i) => (
        <text
          key={i}
          x={PAD.left - 4}
          y={i === 0 ? PAD.top + innerH + 1 : PAD.top + 4}
          textAnchor="end"
          fontSize="8"
          fill="#9ca3af"
        >
          {v}
        </text>
      ))}

      {/* Area fill */}
      <path d={areaD} fill="url(#areaGrad)" />

      {/* Line */}
      <path d={pathD} fill="none" stroke="#000" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />

      {/* X axis date labels */}
      {points.map((p, i) =>
        i % labelEvery === 0 ? (
          <text key={i} x={p.x} y={H - 4} textAnchor="middle" fontSize="7" fill="#9ca3af">
            {p.date.slice(5)} {/* MM-DD */}
          </text>
        ) : null
      )}

      {/* Dots on data points */}
      {points.map((p, i) => (
        p.count > 0 ? (
          <circle key={i} cx={p.x} cy={p.y} r="2" fill="#000" />
        ) : null
      ))}
    </svg>
  )
}

export default function Dashboard({ onNavigate }: Props) {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
    refetchInterval: 30_000,
  })
  const { data: recent = [] } = useQuery({
    queryKey: ['bookings', 'recent'],
    queryFn: () => getBookings(),
  })
  const { data: dailyStats = [] } = useQuery({
    queryKey: ['daily-stats'],
    queryFn: () => getDailyStats(30),
    refetchInterval: 60_000,
  })

  const pending   = recent.filter(b => b.status === 'pending').slice(0, 5)
  const latestAll = recent.slice(0, 8)

  const totalThisMonth = dailyStats.reduce((s, d) => s + d.count, 0)

  if (statsLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded-xl" />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of your chauffeur booking operations</p>
      </div>

      {/* Stats + chart — single row */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <StatCard label="Today's Jobs"   value={stats?.today_bookings ?? 0} icon={CalendarCheck} sub={`${stats?.today_remaining ?? 50} slots remaining`} />
        <StatCard label="Pending Review" value={stats?.pending ?? 0}        icon={Clock}         sub="awaiting" />
        <StatCard label="Confirmed"      value={stats?.approved ?? 0}       icon={CheckCircle2} />
        <StatCard label="Rejected"       value={stats?.rejected ?? 0}       icon={XCircle} />

        {/* Chart — spans 2 columns alongside the stat cards */}
        <div className="card p-5 col-span-2">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm text-gray-500 font-medium">Daily Bookings</p>
              <p className="text-xs text-gray-400 mt-0.5">Last 30 days</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900">{totalThisMonth}</p>
              <p className="text-xs text-gray-400">total</p>
            </div>
          </div>
          <LineGraph data={dailyStats} />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending approvals */}
        <div className="card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Pending Approval</h2>
            <button
              onClick={() => onNavigate('approvals')}
              className="text-xs text-gray-500 hover:text-black flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {pending.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-gray-400">No pending requests</div>
            ) : (
              pending.map(b => {
                const slot = getSlotInfo(b.time_slot)
                const tier = TIER_CONFIG[b.tier]
                return (
                  <div key={b.id} className="px-6 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{b.client_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDate(b.booking_date)} · {slot?.display ?? b.time_slot}
                      </p>
                    </div>
                    <span className={`${tier.cls} text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap`}>
                      {tier.label}
                    </span>
                    <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-medium">
                      Pending
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Recent activity */}
        <div className="card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Activity</h2>
            <button
              onClick={() => onNavigate('history')}
              className="text-xs text-gray-500 hover:text-black flex items-center gap-1 transition-colors"
            >
              All history <ArrowRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {latestAll.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-gray-400">No bookings yet</div>
            ) : (
              latestAll.map(b => {
                const status = STATUS_CONFIG[b.status]
                return (
                  <div key={b.id} className="px-6 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${status.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{b.client_name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{timeAgo(b.created_at)}</p>
                    </div>
                    <span className={`${status.cls} text-xs px-2 py-0.5 rounded-full font-medium`}>
                      {status.label}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
