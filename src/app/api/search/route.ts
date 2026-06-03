import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() ?? ''

  if (q.length < 2) {
    return NextResponse.json({
      tasks: [], memories: [], documents: [], habits: [],
      bucketTrips: [], bucketExperiences: [], goals: [],
      appointments: [], subscriptions: [], wishlistItems: [],
      inventoryItems: [], travelTrips: [], maintenanceItems: [],
    })
  }

  const [
    tasks, memories, documents, habits,
    bucketTrips, bucketExperiences, lifeAreas,
    appointments, subscriptions, wishlistItems,
    inventoryItems, travelTrips, homeItems,
  ] = await Promise.all([
    prisma.task.findMany({
      where: {
        done: false,
        OR: [
          { title: { contains: q } },
          { notes: { contains: q } },
          { category: { contains: q } },
        ],
      },
      select: { id: true, title: true, priority: true, dueDate: true, category: true },
      take: 10,
    }),
    prisma.memory.findMany({
      where: {
        OR: [
          { title: { contains: q } },
          { notes: { contains: q } },
          { location: { contains: q } },
          { tags: { contains: q } },
        ],
      },
      select: { id: true, title: true, date: true, category: true, location: true },
      take: 10,
    }),
    prisma.document.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { notes: { contains: q } },
          { category: { contains: q } },
          { tags: { contains: q } },
        ],
      },
      select: { id: true, name: true, category: true, expiryDate: true },
      take: 10,
    }),
    prisma.habit.findMany({
      where: { archivedAt: null, name: { contains: q } },
      select: { id: true, name: true, color: true },
      take: 5,
    }),
    prisma.bucketTrip.findMany({
      where: {
        OR: [
          { destination: { contains: q } },
          { notes: { contains: q } },
        ],
      },
      select: { id: true, destination: true, done: true, targetYear: true },
      take: 5,
    }),
    prisma.bucketExperience.findMany({
      where: {
        OR: [
          { title: { contains: q } },
          { notes: { contains: q } },
        ],
      },
      select: { id: true, title: true, category: true, done: true },
      take: 5,
    }),
    prisma.lifeArea.findMany({
      include: {
        goals: {
          where: {
            OR: [
              { title: { contains: q } },
              { notes: { contains: q } },
            ],
          },
          select: { id: true, title: true, timePeriod: true },
        },
      },
    }),
    prisma.appointment.findMany({
      where: {
        done: false,
        OR: [
          { title: { contains: q } },
          { notes: { contains: q } },
          { location: { contains: q } },
          { category: { contains: q } },
        ],
      },
      select: { id: true, title: true, date: true, category: true, location: true },
      take: 5,
    }),
    prisma.subscription.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { notes: { contains: q } },
        ],
      },
      select: { id: true, name: true, cost: true, period: true, active: true },
      take: 5,
    }),
    prisma.wishlistItem.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { notes: { contains: q } },
        ],
      },
      select: { id: true, name: true, cost: true, priority: true, purchased: true },
      take: 5,
    }),
    prisma.inventoryItem.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { notes: { contains: q } },
        ],
      },
      select: { id: true, name: true, cost: true },
      take: 5,
    }),
    prisma.travelTrip.findMany({
      where: {
        OR: [
          { notes: { contains: q } },
          { cities: { contains: q } },
          { country: { name: { contains: q } } },
        ],
      },
      select: { id: true, startDate: true, endDate: true, cities: true, country: { select: { name: true } } },
      take: 5,
    }),
    prisma.homeItem.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { notes: { contains: q } },
          { tasks: { some: { description: { contains: q } } } },
        ],
      },
      select: { id: true, name: true },
      take: 5,
    }),
  ])

  const goals = lifeAreas
    .flatMap(a => a.goals.map(g => ({ ...g, areaName: a.name })))
    .slice(0, 5)

  return NextResponse.json({
    tasks,
    memories,
    documents,
    habits,
    bucketTrips,
    bucketExperiences,
    goals,
    appointments,
    subscriptions,
    wishlistItems,
    inventoryItems,
    travelTrips: travelTrips.map(t => ({
      id: t.id,
      countryName: t.country.name,
      cities: t.cities,
      startDate: t.startDate,
      endDate: t.endDate,
    })),
    maintenanceItems: homeItems,
  })
}
