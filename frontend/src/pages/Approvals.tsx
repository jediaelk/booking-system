import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, XCircle, Loader2, User, MapPin, Calendar, Clock, Users } from 'lucide-react'
import { getBookings, approveBooking, rejectBooking } from '../api'
import { STATUS_CONFIG, TIER_CONFIG, formatDate, getSlotInfo, timeAgo } from '../utils'
import type { Booking } from '../types'

type Tab = 'pending' | 'all'

function RejectModal({
  booking,
  onClose,
  onConfirm,
  loading,
}: {
  booking: Booking
  onClose: () => void
  onConfirm: (reason: string) => void
  loading: boolean
}) {
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Reject Booking</h3>
          <p className="text-sm text-gray-500 mt-1">Rejecting booking for {booking.client_name}</p>
        </div>
        <div className="px-6 py-4">
          <label className="label">Reason (optional — sent to client)</label>
          <textarea
            rows={3}
            className="input resize-none"
            placeholder="e.g. Fleet fully committed on this date…"
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
        </div>
        <div className="px-6 py-4 flex gap-3 justify-end border-t border-gray-100">
          <button className="btn-outline" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn-danger flex items-center gap-2" onClick={() => onConfirm(reason)} disabled={loading}>
            {loading && <Loader2 size={14} className="animate-spin" />}
            Reject Booking
          </button>
        </div>
      </div>
    </div>
  )
}

function BookingCard({ booking, onApprove, onReject, approving, rejecting }: {
  booking: Booking
  onApprove: () => void
  onReject: () => void
  approving: boolean
  rejecting: boolean
}) {
  const slot = getSlotInfo(booking.time_slot)
  const tier = TIER_CONFIG[booking.tier]
  const status = STATUS_CONFIG[booking.status]

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`${tier.cls} text-xs px-2.5 py-1 rounded-full font-medium`}>{tier.label}</span>
            <span className={`${status.cls} text-xs px-2.5 py-1 rounded-full font-medium`}>{status.label}</span>
          </div>
          <h3 className="font-semibold text-gray-900 text-base">{booking.client_name}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{booking.client_email}</p>
        </div>
        <span className="text-xs text-gray-400">{timeAgo(booking.created_at)}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div className="flex items-start gap-2">
          <Calendar size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-gray-500 text-xs">Date</p>
            <p className="font-medium">{formatDate(booking.booking_date)}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Clock size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-gray-500 text-xs">Time</p>
            <p className="font-medium">{slot?.display ?? booking.time_slot}</p>
            <p className="text-gray-400 text-xs">{slot?.label}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-gray-500 text-xs">Pickup</p>
            <p className="font-medium text-xs leading-tight">{booking.pickup_location}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-gray-500 text-xs">Dropoff</p>
            <p className="font-medium text-xs leading-tight">{booking.dropoff_location}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <User size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-gray-500 text-xs">Phone</p>
            <p className="font-medium">{booking.client_phone}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Users size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-gray-500 text-xs">Passengers</p>
            <p className="font-medium">{booking.passengers}</p>
          </div>
        </div>
      </div>

      {booking.special_requests && (
        <div className="bg-gray-50 rounded-lg px-3 py-2 mb-4 text-xs text-gray-600">
          <span className="font-medium">Special requests: </span>{booking.special_requests}
        </div>
      )}

      {booking.rejection_reason && (
        <div className="bg-red-50 rounded-lg px-3 py-2 mb-4 text-xs text-red-700">
          <span className="font-medium">Rejection reason: </span>{booking.rejection_reason}
        </div>
      )}

      {booking.status === 'pending' && (
        <div className="flex gap-2 pt-2">
          <button
            className="btn-success flex-1 flex items-center justify-center gap-2"
            onClick={onApprove}
            disabled={approving || rejecting}
          >
            {approving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Approve
          </button>
          <button
            className="flex-1 border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
            onClick={onReject}
            disabled={approving || rejecting}
          >
            {rejecting ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
            Reject
          </button>
        </div>
      )}
    </div>
  )
}

export default function Approvals() {
  const [tab, setTab] = useState<Tab>('pending')
  const [rejectTarget, setRejectTarget] = useState<Booking | null>(null)
  const [actionId, setActionId] = useState<number | null>(null)
  const qc = useQueryClient()

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['bookings', tab],
    queryFn: () => getBookings(tab === 'pending' ? { status: 'pending' } : undefined),
    refetchInterval: 15_000,
  })

  const approveMutation = useMutation({
    mutationFn: (id: number) => approveBooking(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      setActionId(null)
    },
    onError: () => setActionId(null),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => rejectBooking(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      setRejectTarget(null)
      setActionId(null)
    },
    onError: () => setActionId(null),
  })

  const handleApprove = (id: number) => {
    setActionId(id)
    approveMutation.mutate(id)
  }

  const handleRejectConfirm = (reason: string) => {
    if (!rejectTarget) return
    setActionId(rejectTarget.id)
    rejectMutation.mutate({ id: rejectTarget.id, reason })
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Approvals</h1>
        <p className="text-sm text-gray-500 mt-1">Review and manage booking requests</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {(['pending', 'all'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'pending' ? 'Pending Review' : 'All Bookings'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle2 size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">
            {tab === 'pending' ? 'No pending bookings' : 'No bookings yet'}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {tab === 'pending' ? 'All caught up!' : 'Submitted bookings will appear here'}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {bookings.map(b => (
            <BookingCard
              key={b.id}
              booking={b}
              approving={actionId === b.id && approveMutation.isPending}
              rejecting={actionId === b.id && rejectMutation.isPending}
              onApprove={() => handleApprove(b.id)}
              onReject={() => setRejectTarget(b)}
            />
          ))}
        </div>
      )}

      {rejectTarget && (
        <RejectModal
          booking={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onConfirm={handleRejectConfirm}
          loading={rejectMutation.isPending}
        />
      )}
    </div>
  )
}
