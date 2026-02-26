import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation } from '@tanstack/react-query'
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
  time_slot:        z.string().min(1, 'Please select a time slot'),
})
type FormValues = z.infer<typeof schema>

const today = toDateStr(new Date())

export default function PublicBooking() {
  const [success, setSuccess] = useState(false)

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

  const tier         = watch('tier') as Tier
  const date         = watch('booking_date')
  const selectedSlot = watch('time_slot')

  const { data: avail, isFetching: availLoading } = useQuery({
    queryKey: ['availability', date, tier],
    queryFn:  () => getAvailability(date, tier),
    enabled:  !!date && !!tier,
  })

  const mutation = useMutation({
    mutationFn: createBooking,
    onSuccess:  () => setSuccess(true),
  })

  const onSubmit = (data: FormValues) => mutation.mutate(data)

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Received</h2>
          <p className="text-gray-500 leading-relaxed mb-2">
            Your booking request has been submitted. You'll receive a confirmation email shortly.
          </p>
          <p className="text-gray-400 text-sm mb-8">
            Once reviewed, you'll get a second email confirming your booking details.
          </p>
          <button
            className="btn-primary px-6 py-2.5"
            onClick={() => { setSuccess(false); reset() }}
          >
            Make Another Booking
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <span className="text-base font-bold tracking-tight">Refine Chauffeur</span>
          <span className="text-xs font-medium text-gray-400 uppercase tracking-widest">Booking</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Book a Chauffeur</h1>
          <p className="text-gray-500 mt-2">Fill in the details below and we'll confirm your booking shortly.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

          {/* Tier */}
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Service Tier</h2>
            <div className="grid grid-cols-2 gap-3">
              {(['premium', 'ultra_premium'] as Tier[]).map(t => {
                const cfg    = TIER_CONFIG[t]
                const active = tier === t
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setValue('tier', t); setValue('time_slot', '') }}
                    className={`p-5 border-2 rounded-xl text-left transition-all ${
                      active
                        ? 'border-black bg-black text-white'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-bold text-base">{cfg.label}</div>
                    <div className={`text-xs mt-1 ${active ? 'text-gray-300' : 'text-gray-400'}`}>
                      {t === 'premium' ? 'Mercedes E-Class, BMW 5 Series, Audi A6…' : 'Rolls-Royce, Bentley, S-Class…'}
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Date & slot */}
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Date & Time</h2>
            <div className="mb-5">
              <label className="label">Select Date</label>
              <input
                type="date"
                min={today}
                className="input max-w-xs"
                {...register('booking_date', { onChange: () => setValue('time_slot', '') })}
              />
              {errors.booking_date && <p className="text-red-500 text-xs mt-1">{errors.booking_date.message}</p>}
            </div>

            {date && (
              <div>
                <label className="label flex items-center gap-2">
                  Available Time Slots
                  {availLoading && <Loader2 size={12} className="animate-spin text-gray-400" />}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {TIME_SLOTS.map(slot => {
                    const available  = avail?.available_slots.includes(slot.value) ?? true
                    const remaining  = avail?.slots_detail[slot.value] ?? 5
                    const selected   = selectedSlot === slot.value
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
                              ? 'border-gray-200 hover:border-gray-400'
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
          </section>

          {/* Journey */}
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Journey Details</h2>
            <div className="space-y-4">
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Passengers</label>
                  <select className="input" {...register('passengers')}>
                    {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Special Requests</label>
                  <input className="input" placeholder="Child seat, meet & greet…" {...register('special_requests')} />
                </div>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Your Details</h2>
            <div className="space-y-4">
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
              <div>
                <label className="label">Phone Number</label>
                <input className="input" placeholder="+44 7700 900000" {...register('client_phone')} />
                {errors.client_phone && <p className="text-red-500 text-xs mt-1">{errors.client_phone.message}</p>}
              </div>
            </div>
          </section>

          {mutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {(mutation.error as any)?.response?.data?.detail ?? 'Something went wrong. Please try again.'}
            </div>
          )}

          <div className="pb-10">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full btn-primary py-3 text-base flex items-center justify-center gap-2"
            >
              {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
              {mutation.isPending ? 'Submitting…' : 'Request Booking'}
            </button>
            <p className="text-center text-xs text-gray-400 mt-3">
              You'll receive an email confirmation once your request has been reviewed.
            </p>
          </div>
        </form>
      </main>
    </div>
  )
}
