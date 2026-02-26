export type Tier = 'premium' | 'ultra_premium'
export type Status = 'pending' | 'approved' | 'rejected' | 'completed'
export type Page = 'dashboard' | 'booking' | 'approvals' | 'calendar' | 'history' | 'fleet'

export interface Booking {
  id: number
  client_name: string
  client_email: string
  client_phone: string
  pickup_location: string
  dropoff_location: string
  passengers: number
  special_requests?: string
  tier: Tier
  booking_date: string
  time_slot: string
  status: Status
  car_id?: number
  rejection_reason?: string
  created_at: string
  updated_at?: string
}

export interface BookingCreate {
  client_name: string
  client_email: string
  client_phone: string
  pickup_location: string
  dropoff_location: string
  passengers: number
  special_requests?: string
  tier: Tier
  booking_date: string
  time_slot: string
}

export interface Car {
  id: number
  name: string
  plate: string
  tier: Tier
  is_active: boolean
}

export interface Stats {
  total_bookings: number
  pending: number
  approved: number
  completed: number
  rejected: number
  today_bookings: number
  today_remaining: number
}

export interface Availability {
  date: string
  tier: Tier
  available_slots: string[]
  slots_detail: Record<string, number>
}
