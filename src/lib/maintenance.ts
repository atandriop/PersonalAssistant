export type TaskStatus = 'overdue' | 'due-soon' | 'ok' | 'none'

export interface MaintenanceTask {
  id: number
  description: string
  intervalMonths: number | null
  dueDate: string | null
  lastDoneDate: string | null
  createdAt: string
}

export interface HomeItem {
  id: number
  name: string
  tasks: MaintenanceTask[]
}

export function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr)
  const targetMonth = d.getUTCMonth() + months
  d.setUTCMonth(targetMonth)
  if (d.getUTCMonth() !== ((targetMonth % 12) + 12) % 12) d.setUTCDate(0)
  return d.toISOString().slice(0, 10)
}

export function getTaskStatus(task: MaintenanceTask): { status: TaskStatus; nextDue: string | null } {
  const today = new Date().toISOString().slice(0, 10)
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  let nextDue: string | null = null
  if (task.intervalMonths != null) {
    const base = task.lastDoneDate ?? task.createdAt.slice(0, 10)
    nextDue = addMonths(base, task.intervalMonths)
  } else if (task.dueDate != null) {
    if (task.lastDoneDate && task.lastDoneDate >= task.dueDate) {
      return { status: 'none', nextDue: null }
    }
    nextDue = task.dueDate
  }
  if (!nextDue) return { status: 'none', nextDue: null }
  if (nextDue < today) return { status: 'overdue', nextDue }
  if (nextDue <= in30) return { status: 'due-soon', nextDue }
  return { status: 'ok', nextDue }
}
