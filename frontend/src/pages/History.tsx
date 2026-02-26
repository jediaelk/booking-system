import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, CheckCircle2, Loader2 } from 'lucide-react'
import { getBookings, completeBooking } from '../api'
import { STATUS_CONFIG, TIER_CONFIG, formatDate, getSlotInfo, timeAgo } from '../utils'
import type { Status } from '../types'

const STATUS_TABS: { value: Status | 'all'; label: string }[] = [
  { value: 'all',       label: 'All'       },
  { value: 'pending',   label: 'Pending'   },
  { value: 'approved',  label: 'Approved'  },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected',  label: 'Rejected'  },
]

export default function History() {
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all')
  const [search, setSearch] = useState('')
  const qc = useQueryClient()

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['bookings', 'history', statusFilter],
    queryFn: () => getBookings(statusFilter !== 'all' ? { status: statusFilter } : undefined),
  })

  const completeMutation = useMutation({
    mutationFn: completeBooking,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
    },
  })

  const filtered = bookings.filter(b => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      b.client_name.toLowerCase().includes(q) ||
      b.client_email.toLowerCase().includes(q) ||
      b.pickup_location.toLowerCase().includes(q) ||
      b.dropoff_location.toLowerCase().includes(q)
    )
  })

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Booking History</h1>
        <p className="text-sm text-gray-500 mt-1">All booking records and their current status</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-5">
        {/* Status tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg flex-wrap">
          {STATUS_TABS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                statusFilter === value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-xs w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, location…"
            className="input pl-8 text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">ID</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Client</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Tier</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Date & Slot</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Journey</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Pax</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Submitted</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400 text-sm">Loading…</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400 text-sm">
                    {search ? 'No results match your search' : 'No bookings found'}
                  </td>
                </tr>
              ) : (
                filtered.map(b => {
                  const status = STATUS_CONFIG[b.status]
                  const tier   = TIER_CONFIG[b.tier]
                  const slot   = getSlotInfo(b.time_slot)
                  return (
                    <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-gray-400 font-mono text-xs">#{b.id}</td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{b.client_name}</p>
                        <p className="text-gray-400 text-xs">{b.client_email}</p>
                        <p className="text-gray-400 text-xs">{b.client_phone}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`${tier.cls} text-xs px-2 py-0.5 rounded-full font-medium`}>
                          {tier.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium">{formatDate(b.booking_date)}</p>
                        <p className="text-gray-400 text-xs">{slot?.display ?? b.time_slot} · {slot?.label}</p>
                      </td>
                      <td className="py-3 px-4 max-w-[160px]">
                        <p className="text-xs truncate" title={b.pickup_location}>↑ {b.pickup_location}</p>
                        <p className="text-xs text-gray-500 truncate" title={b.dropoff_location}>↓ {b.dropoff_location}</p>
                      </td>
                      <td className="py-3 px-4 text-center">{b.passengers}</td>
                      <td className="py-3 px-4">
                        <span className={`${status.cls} text-xs px-2.5 py-1 rounded-full font-medium`}>
                          {status.label}
                        </span>
                        {b.rejection_reason && (
                          <p className="text-red-400 text-xs mt-0.5 max-w-[120px] truncate" title={b.rejection_reason}>
                            {b.rejection_reason}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-xs whitespace-nowrap">
                        {timeAgo(b.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        {b.status === 'approved' && (
                          <button
                            onClick={() => completeMutation.mutate(b.id)}
                            disabled={completeMutation.isPending}
                            title="Mark as completed"
                            className="text-xs text-gray-400 hover:text-green-600 transition-colors flex items-center gap-1"
                          >
                            {completeMutation.isPending && completeMutation.variables === b.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={12} />
                            )}
                            Complete
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
            {filtered.length} booking{filtered.length !== 1 ? 's' : ''}
            {search && ` matching "${search}"`}
          </div>
        )}
      </div>
    </div>
  )
}
