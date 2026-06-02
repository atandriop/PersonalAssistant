export interface Habit { id: number; name: string; color: string }
export interface Milestone { id: number; completedAt: string | null }
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
