import { format, parseISO, formatDistanceToNow, startOfMonth, endOfMonth, eachDayOfInterval, getDay, getDaysInMonth } from 'date-fns'
import type { Status, Tier } from './types'

export const TIME_SLOTS = [
  { value: '09:00', label: 'Morning',   display: '9:00 AM',  end: '12:00 PM' },
  { value: '12:00', label: 'Midday',    display: '12:00 PM', end: '3:00 PM'  },
  { value: '14:00', label: 'Afternoon', display: '2:00 PM',  end: '5:00 PM'  },
]

export const getSlotInfo = (value: string) => TIME_SLOTS.find(s => s.value === value)

export const formatDate = (dateStr: string) => {
  try { return format(parseISO(dateStr), 'MMM d, yyyy') } catch { return dateStr }
}

export const formatDateShort = (dateStr: string) => {
  try { return format(parseISO(dateStr), 'MMM d') } catch { return dateStr }
}

export const timeAgo = (dateStr: string) => {
  try { return formatDistanceToNow(parseISO(dateStr), { addSuffix: true }) } catch { return '' }
}

export const toDateStr = (d: Date) => format(d, 'yyyy-MM-dd')

export const STATUS_CONFIG: Record<Status, { label: string; cls: string; dot: string }> = {
  pending:   { label: 'Pending',   cls: 'bg-amber-100 text-amber-800',  dot: 'bg-amber-400'  },
  approved:  { label: 'Approved',  cls: 'bg-green-100 text-green-800',  dot: 'bg-green-500'  },
  rejected:  { label: 'Rejected',  cls: 'bg-red-100 text-red-800',      dot: 'bg-red-500'    },
  completed: { label: 'Completed', cls: 'bg-gray-100 text-gray-600',    dot: 'bg-gray-400'   },
}

export const TIER_CONFIG: Record<Tier, { label: string; cls: string }> = {
  premium:       { label: 'Premium',       cls: 'bg-sky-100 text-sky-800'       },
  ultra_premium: { label: 'Ultra Premium', cls: 'bg-violet-100 text-violet-800' },
}

// Build a calendar grid for a given month (Date object)
export function buildCalendarGrid(month: Date) {
  const first = startOfMonth(month)
  const last  = endOfMonth(month)
  const days  = eachDayOfInterval({ start: first, end: last })
  const startPad = getDay(first) // 0=Sun
  return { days, startPad, daysInMonth: getDaysInMonth(month) }
}
