export const TRIP_INCLUDE = {
  include: {
    trip: {
      select: {
        id: true,
        startDate: true,
        country: { select: { name: true } },
      },
    },
  },
} as const

export function serializeMemory(m: {
  id: number; title: string; date: string; endDate: string | null
  category: string; location: string | null; notes: string | null
  tags: string
  createdAt: Date
  trips: { trip: { id: number; startDate: string | null; country: { name: string } } }[]
}) {
  return {
    id: m.id,
    title: m.title,
    date: m.date,
    endDate: m.endDate,
    category: m.category,
    location: m.location,
    notes: m.notes,
    tags: m.tags ? m.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    createdAt: m.createdAt.toISOString(),
    trips: m.trips.map(mt => ({
      id: mt.trip.id,
      countryName: mt.trip.country.name,
      startDate: mt.trip.startDate,
    })),
  }
}
