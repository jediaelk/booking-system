import { useQuery } from '@tanstack/react-query'
import { Car as CarIcon } from 'lucide-react'
import { getFleet, getBookings } from '../api'
import { TIER_CONFIG, formatDate, getSlotInfo } from '../utils'
import type { Car } from '../types'

function CarCard({ car, activeBookings }: { car: Car; activeBookings: number }) {
  const tier = TIER_CONFIG[car.tier]
  const utilPct = Math.round((activeBookings / 20) * 100) // rough utilization indicator

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
          <CarIcon size={20} className="text-gray-600" />
        </div>
        <span className={`${tier.cls} text-xs px-2.5 py-1 rounded-full font-medium`}>{tier.label}</span>
      </div>
      <h3 className="font-semibold text-gray-900 mb-0.5">{car.name}</h3>
      <p className="text-xs text-gray-400 font-mono mb-3">{car.plate}</p>

      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-500">Active bookings</span>
        <span className="font-medium">{activeBookings}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-black rounded-full transition-all"
          style={{ width: `${Math.min(utilPct, 100)}%` }}
        />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full ${car.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
        <span className="text-xs text-gray-500">{car.is_active ? 'Active' : 'Inactive'}</span>
      </div>
    </div>
  )
}

export default function Fleet() {
  const { data: cars = [], isLoading: carsLoading } = useQuery({
    queryKey: ['fleet'],
    queryFn: getFleet,
  })
  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings', 'approved'],
    queryFn: () => getBookings({ status: 'approved' }),
  })

  const carBookingCount = (carId: number) => bookings.filter(b => b.car_id === carId).length

  const premium      = cars.filter(c => c.tier === 'premium')
  const ultraPremium = cars.filter(c => c.tier === 'ultra_premium')

  const approvedBookings   = bookings
  const recentBookings     = [...bookings].slice(0, 5)

  if (carsLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-32" />
          <div className="grid grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-48 bg-gray-200 rounded-xl" />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Fleet Management</h1>
        <p className="text-sm text-gray-500 mt-1">10 vehicles across 2 service tiers</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="card p-4">
          <p className="text-xs text-gray-500 font-medium">Total Fleet</p>
          <p className="text-2xl font-bold mt-0.5">{cars.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 font-medium">Premium</p>
          <p className="text-2xl font-bold mt-0.5">{premium.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 font-medium">Ultra Premium</p>
          <p className="text-2xl font-bold mt-0.5">{ultraPremium.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 font-medium">Confirmed Jobs</p>
          <p className="text-2xl font-bold mt-0.5">{approvedBookings.length}</p>
        </div>
      </div>

      {/* Premium tier */}
      <section className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="font-semibold text-gray-900">Premium Fleet</h2>
          <span className="bg-sky-100 text-sky-800 text-xs px-2.5 py-1 rounded-full font-medium">
            {premium.length} vehicles
          </span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {premium.map(car => (
            <CarCard key={car.id} car={car} activeBookings={carBookingCount(car.id)} />
          ))}
        </div>
      </section>

      {/* Ultra Premium tier */}
      <section className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="font-semibold text-gray-900">Ultra Premium Fleet</h2>
          <span className="bg-violet-100 text-violet-800 text-xs px-2.5 py-1 rounded-full font-medium">
            {ultraPremium.length} vehicles
          </span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {ultraPremium.map(car => (
            <CarCard key={car.id} car={car} activeBookings={carBookingCount(car.id)} />
          ))}
        </div>
      </section>

      {/* Recent confirmed bookings */}
      {recentBookings.length > 0 && (
        <section>
          <h2 className="font-semibold text-gray-900 mb-4">Confirmed Bookings</h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Client</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Date & Slot</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Tier</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Vehicle</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Journey</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map(b => {
                  const slot    = getSlotInfo(b.time_slot)
                  const tier    = TIER_CONFIG[b.tier]
                  const vehicle = cars.find(c => c.id === b.car_id)
                  return (
                    <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="font-medium">{b.client_name}</p>
                        <p className="text-gray-400 text-xs">{b.client_phone}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium">{formatDate(b.booking_date)}</p>
                        <p className="text-gray-400 text-xs">{slot?.display} · {slot?.label}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`${tier.cls} text-xs px-2 py-0.5 rounded-full font-medium`}>{tier.label}</span>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {vehicle ? (
                          <div>
                            <p className="font-medium">{vehicle.name}</p>
                            <p className="text-gray-400 text-xs font-mono">{vehicle.plate}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs max-w-[160px]">
                        <p className="truncate">↑ {b.pickup_location}</p>
                        <p className="text-gray-500 truncate">↓ {b.dropoff_location}</p>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
