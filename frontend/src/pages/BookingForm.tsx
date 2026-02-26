import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { getAvailability, createBooking } from '../api'
import { TIME_SLOTS, TIER_CONFIG, toDateStr } from '../utils'
import type { Tier } from '../types'

const schema = z.object({
  client_name:      z.string().min(2, 'Name is required'),
  client_email:     z.string().email('Valid email required'),
  client_phone:     z.string().min(7, 'Phone number required'),
  pickup_location:  z.string().min(3, 'Pickup location required'),
  dropoff_location: z.string().min(3, 'Dropoff location required'),
  passengers:       z.coerce.number().min(1).max(8),
  special_requests: z.string().optional(),
  tier:             z.enum(['premium', 'ultra_premium']),
  booking_date:     z.string().min(1, 'Date required'),
  time_slot:        z.string().min(1, 'Time slot required'),
})
type FormValues = z.infer<typeof schema>

const today = toDateStr(new Date())

export default function BookingForm() {
  const [success, setSuccess] = useState(false)
  const qc = useQueryClient()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { passengers: 1, tier: 'premium' },
  })

  const tier        = watch('tier') as Tier
  const date        = watch('booking_date')
  const selectedSlot = watch('time_slot')

  const { data: avail, isFetching: availLoading } = useQuery({
    queryKey: ['availability', date, tier],
    queryFn:  () => getAvailability(date, tier),
    enabled:  !!date && !!tier,
  })

  const mutation = useMutation({
    mutationFn: createBooking,
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      setSuccess(true)
    },
  })

  const onSubmit = (data: FormValues) => mutation.mutate(data)

  if (success) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Booking Submitted</h2>
          <p className="text-gray-500 text-sm mb-6">
            Your request has been received and sent to the approver for review. You'll receive a confirmation email once approved.
          </p>
          <button
            className="btn-primary"
            onClick={() => { setSuccess(false); reset() }}
          >
            Submit Another Booking
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">New Booking</h1>
        <p className="text-sm text-gray-500 mt-1">Submit a chauffeur booking request</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

        {/* Tier selection */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Service Tier</h2>
          <div className="grid grid-cols-2 gap-4">
            {(['premium', 'ultra_premium'] as Tier[]).map(t => {
              const cfg = TIER_CONFIG[t]
              const active = tier === t
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setValue('tier', t); setValue('time_slot', '') }}
                  className={`p-5 border-2 rounded-xl text-left transition-all ${
                    active
                      ? 'border-black bg-black text-white'
                      : 'border-gray-200 hover:border-gray-400 text-gray-700'
                  }`}
                >
                  <div className="text-base font-bold">{cfg.label}</div>
                  <div className={`text-xs mt-1 ${active ? 'text-gray-300' : 'text-gray-400'}`}>
                    {t === 'premium' ? 'Mercedes E-Class, BMW 5 Series, Audi A6…' : 'Rolls-Royce Ghost, Bentley, S-Class…'}
                  </div>
                </button>
              )
            })}
          </div>
          {errors.tier && <p className="text-red-500 text-xs mt-2">{errors.tier.message}</p>}
        </div>

        {/* Date & Time */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Date & Time</h2>

          <div className="mb-5">
            <label className="label">Booking Date</label>
            <input
              type="date"
              min={today}
              className="input max-w-xs"
              {...register('booking_date', {
                onChange: () => setValue('time_slot', ''),
              })}
            />
            {errors.booking_date && <p className="text-red-500 text-xs mt-1">{errors.booking_date.message}</p>}
          </div>

          {date && (
            <div>
              <label className="label flex items-center gap-2">
                Time Slot
                {availLoading && <Loader2 size={12} className="animate-spin text-gray-400" />}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {TIME_SLOTS.map(slot => {
                  const available = avail?.available_slots.includes(slot.value) ?? true
                  const remaining = avail?.slots_detail[slot.value] ?? 5
                  const selected  = selectedSlot === slot.value
                  return (
                    <button
                      key={slot.value}
                      type="button"
                      disabled={!available}
                      onClick={() => setValue('time_slot', slot.value)}
                      className={`p-3 border-2 rounded-xl text-left text-sm transition-all ${
                        selected
                          ? 'border-black bg-black text-white'
                          : available
                            ? 'border-gray-200 hover:border-gray-400 text-gray-700'
                            : 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                      }`}
                    >
                      <div className="font-semibold">{slot.display}</div>
                      <div className={`text-xs mt-0.5 ${selected ? 'text-gray-300' : 'text-gray-400'}`}>
                        {slot.label} · until {slot.end}
                      </div>
                      {!available ? (
                        <div className="text-xs mt-1 text-red-400">Full</div>
                      ) : (
                        <div className={`text-xs mt-1 ${selected ? 'text-gray-300' : 'text-gray-400'}`}>
                          {remaining} of 5 left
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
              {errors.time_slot && <p className="text-red-500 text-xs mt-2">{errors.time_slot.message}</p>}
            </div>
          )}
        </div>

        {/* Locations */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Journey Details</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Pickup Location</label>
              <input className="input" placeholder="e.g. 10 Downing Street, London" {...register('pickup_location')} />
              {errors.pickup_location && <p className="text-red-500 text-xs mt-1">{errors.pickup_location.message}</p>}
            </div>
            <div>
              <label className="label">Dropoff Location</label>
              <input className="input" placeholder="e.g. Heathrow Airport, Terminal 5" {...register('dropoff_location')} />
              {errors.dropoff_location && <p className="text-red-500 text-xs mt-1">{errors.dropoff_location.message}</p>}
            </div>
            <div>
              <label className="label">Number of Passengers</label>
              <select className="input" {...register('passengers')}>
                {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Special Requests</label>
              <input className="input" placeholder="Child seat, meet & greet, etc." {...register('special_requests')} />
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Contact Information</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name</label>
              <input className="input" placeholder="John Smith" {...register('client_name')} />
              {errors.client_name && <p className="text-red-500 text-xs mt-1">{errors.client_name.message}</p>}
            </div>
            <div>
              <label className="label">Email Address</label>
              <input className="input" type="email" placeholder="john@example.com" {...register('client_email')} />
              {errors.client_email && <p className="text-red-500 text-xs mt-1">{errors.client_email.message}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="label">Phone Number</label>
              <input className="input max-w-xs" placeholder="+44 7700 900000" {...register('client_phone')} />
              {errors.client_phone && <p className="text-red-500 text-xs mt-1">{errors.client_phone.message}</p>}
            </div>
          </div>
        </div>

        {/* Error */}
        {mutation.isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {(mutation.error as any)?.response?.data?.detail ?? 'Failed to submit booking. Please try again.'}
          </div>
        )}

        <div className="flex items-center justify-between pb-8">
          <p className="text-xs text-gray-400">A confirmation email will be sent to you on approval.</p>
          <button type="submit" disabled={mutation.isPending} className="btn-primary flex items-center gap-2 px-6 py-2.5">
            {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
            {mutation.isPending ? 'Submitting…' : 'Submit Booking'}
          </button>
        </div>
      </form>
    </div>
  )
}
