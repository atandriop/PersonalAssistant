export interface GoalRef { id: number; title: string; timePeriod: string }
export interface GoalLink { id: number; goalId: number; goal: GoalRef }
export interface Habit { id: number; lifeAreaId: number | null; name: string; color: string; goalLinks: GoalLink[]; doneToday?: boolean }
export interface Milestone { id: number; completedAt: string | null; targetDate?: string | null; title?: string }
export interface Goal { id: number; title: string; milestones: Milestone[] }
export interface LifeArea { id: number; name: string; goals: Goal[] }
export interface GiftIdea { id: number; estimatedCost: number | null; purchased: boolean }
export interface GiftPerson { id: number; name: string; budget: number | null; ideas: GiftIdea[] }
export interface Subscription {
  id: number; name: string; cost: number; period: string
  active: boolean; renewalDate?: string | null
}

export interface Subtask {
  id: number
  taskId: number
  title: string
  done: boolean
}

export interface TaskSourceLink {
  id: number
  taskId: number
  sourceType: 'wishlist' | 'goal'
  sourceId: number
}

export interface Task {
  id: number
  title: string
  priority: string
  dueDate: string | null
  category: string | null
  notes: string | null
  done: boolean
  recurring: boolean
  recurringInterval: string | null
  blockedById: number | null
  blockedByTitle: string | null
  createdAt: string
  subtasks: Subtask[]
  sourceLink: TaskSourceLink | null
}

export interface Appointment {
  id: number
  title: string
  date: string
  time: string | null
  location: string | null
  category: string
  notes: string | null
  done: boolean
  cost: number | null
  recurring: boolean
  recurringInterval: string | null
  createdAt: string
}

export interface Document {
  id: number
  name: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  category: string
  notes: string | null
  expiryDate: string | null
  tags: string[]
  createdAt: string
}

export interface BucketTrip {
  id: number
  destination: string
  cities: string[]
  budget: number | null
  targetYear: number | null
  notes: string | null
  done: boolean
  linkedToTravel: boolean
  createdAt: string
}

export interface BucketExperience {
  id: number
  title: string
  category: string
  notes: string | null
  targetYear: number | null
  done: boolean
  createdAt: string
}

export interface TravelCountry {
  id: number
  name: string
  notes: string | null
  createdAt: string
  tripCount: number
  totalSpend: number
  firstVisit: string | null
}

export interface TripCostLine {
  id: number
  category: 'hotel' | 'airfare' | 'food' | 'entertainment'
  amount: number
  label: string | null
  memoryId: number | null
}

export interface TravelTrip {
  id: number
  countryId: number
  countryName: string
  cities: string[]
  startDate: string | null
  endDate: string | null
  actualCost: number | null
  rating: number | null
  notes: string | null
  bucketTripId: number | null
  memories: { id: number; title: string; date: string }[]
  costLines: TripCostLine[]
  createdAt: string
}

export interface Memory {
  id: number
  title: string
  date: string
  endDate: string | null
  category: 'Career' | 'Education' | 'Travel' | 'Personal' | 'Other'
  location: string | null
  notes: string | null
  tags: string[]
  trips: { id: number; countryName: string; startDate: string | null }[]
  createdAt: string
}
