import axios from 'axios'
import type { Booking, BookingCreate, Car, Stats, Availability, Tier, Status } from './types'

const http = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? '' })

export const getAvailability = (date: string, tier: Tier): Promise<Availability> =>
  http.get('/api/availability', { params: { booking_date: date, tier } }).then(r => r.data)

export const createBooking = (data: BookingCreate): Promise<Booking> =>
  http.post('/api/bookings', data).then(r => r.data)

export const getBookings = (params?: {
  status?: Status
  tier?: Tier
  start_date?: string
  end_date?: string
}): Promise<Booking[]> => http.get('/api/bookings', { params }).then(r => r.data)

export const getBooking = (id: number): Promise<Booking> =>
  http.get(`/api/bookings/${id}`).then(r => r.data)

export const approveBooking = (id: number): Promise<Booking> =>
  http.patch(`/api/bookings/${id}/approve`).then(r => r.data)

export const rejectBooking = (id: number, reason?: string): Promise<Booking> =>
  http.patch(`/api/bookings/${id}/reject`, { reason }).then(r => r.data)

export const completeBooking = (id: number): Promise<Booking> =>
  http.patch(`/api/bookings/${id}/complete`).then(r => r.data)

export const getFleet = (): Promise<Car[]> =>
  http.get('/api/fleet').then(r => r.data)

export const getStats = (): Promise<Stats> =>
  http.get('/api/stats').then(r => r.data)

export const getDailyStats = (days = 30): Promise<{ date: string; count: number }[]> =>
  http.get('/api/daily-stats', { params: { days } }).then(r => r.data)
