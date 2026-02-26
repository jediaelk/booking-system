import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { format, addMonths, subMonths, isSameDay, parseISO, isToday } from 'date-fns'
import { getBookings } from '../api'
import { STATUS_CONFIG, TIER_CONFIG, buildCalendarGrid, toDateStr, getSlotInfo } from '../utils'
import type { Booking } from '../types'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarView() {
  const [month, setMonth]         = useState(new Date())
  const [selected, setSelected]   = useState<Date | null>(null)

  const startStr = toDateStr(new Date(month.getFullYear(), month.getMonth(), 1))
  const endStr   = toDateStr(new Date(month.getFullYear(), month.getMonth() + 1, 0))

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings', 'calendar', startStr, endStr],
    queryFn: () => getBookings({ start_date: startStr, end_date: endStr }),
  })

  const { days, startPad } = buildCalendarGrid(month)

  const bookingsForDay = (d: Date) =>
    bookings.filter(b => isSameDay(parseISO(b.booking_date), d))

  const selectedBookings: Booking[] = selected ? bookingsForDay(selected) : []

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        <p className="text-sm text-gray-500 mt-1">Visual overview of all bookings</p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mb-5 flex-wrap">
        {(['pending', 'approved', 'completed', 'rejected'] as const).map(s => {
          const cfg = STATUS_CONFIG[s]
          return (
            <div key={s} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </div>
          )
        })}
      </div>

      <div className="flex gap-6 items-start">
        {/* Calendar grid */}
        <div className="card flex-1 overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <button
              onClick={() => setMonth(m => subMonths(m, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <h2 className="font-semibold text-gray-900">{format(month, 'MMMM yyyy')}</h2>
            <button
              onClick={() => setMonth(m => addMonths(m, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAY_LABELS.map(d => (
              <div key={d} className="py-2 text-center text-xs font-medium text-gray-400">{d}</div>
            ))}
          </div>

          {/* Grid cells */}
          <div className="grid grid-cols-7">
            {/* Padding cells */}
            {[...Array(startPad)].map((_, i) => (
              <div key={`pad-${i}`} className="min-h-[80px] border-r border-b border-gray-50" />
            ))}

            {days.map(day => {
              const dayBookings = bookingsForDay(day)
              const isSelected  = selected && isSameDay(day, selected)
              const todayClass  = isToday(day) ? 'bg-black text-white' : ''

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => setSelected(isSelected ? null : day)}
                  className={`min-h-[80px] border-r border-b border-gray-100 p-1.5 cursor-pointer transition-colors
                    ${isSelected ? 'bg-gray-100' : 'hover:bg-gray-50'}
                  `}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium ${todayClass}`}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayBookings.length > 0 && (
                      <span className="text-xs text-gray-400 mr-1">{dayBookings.length}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-0.5">
                    {dayBookings.slice(0, 4).map(b => (
                      <span
                        key={b.id}
                        className={`w-2 h-2 rounded-full ${STATUS_CONFIG[b.status].dot}`}
                        title={`${b.client_name} — ${STATUS_CONFIG[b.status].label}`}
                      />
                    ))}
                    {dayBookings.length > 4 && (
                      <span className="text-xs text-gray-400 leading-none">+{dayBookings.length - 4}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Day detail panel */}
        {selected && (
          <div className="card w-80 flex-shrink-0">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-900">{format(selected, 'EEEE')}</h3>
                <p className="text-sm text-gray-500">{format(selected, 'MMMM d, yyyy')}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {selectedBookings.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No bookings on this day</p>
              ) : (
                selectedBookings.map(b => {
                  const slot   = getSlotInfo(b.time_slot)
                  const status = STATUS_CONFIG[b.status]
                  const tier   = TIER_CONFIG[b.tier]
                  return (
                    <div key={b.id} className="border border-gray-100 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{b.client_name}</p>
                          <p className="text-xs text-gray-500">{slot?.display ?? b.time_slot} · {slot?.label}</p>
                        </div>
                        <span className={`${status.cls} text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0`}>
                          {status.label}
                        </span>
                      </div>
                      <span className={`${tier.cls} text-xs px-2 py-0.5 rounded-full font-medium`}>
                        {tier.label}
                      </span>
                      <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                        <p>↑ {b.pickup_location}</p>
                        <p>↓ {b.dropoff_location}</p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
