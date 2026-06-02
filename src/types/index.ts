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
