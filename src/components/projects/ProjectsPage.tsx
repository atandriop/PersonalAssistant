'use client'

import { useState } from 'react'
import useSWR from 'swr'
import type { Project, Task } from '@/types'
import Modal from '@/components/ui/Modal'
import ProjectForm from './ProjectForm'
import { Plus, CheckCircle, Circle, Pencil, Trash2 } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function ProjectsPage() {
  const { data: projects = [], mutate } = useSWR<Project[]>('/api/projects', fetcher)
  const { data: tasks = [] } = useSWR<Task[]>('/api/tasks', fetcher)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Project | undefined>()

  const openTasksByProject = tasks.reduce<Record<number, number>>((acc, t) => {
    if (!t.done && t.projectId) {
      acc[t.projectId] = (acc[t.projectId] ?? 0) + 1
    }
    return acc
  }, {})

  async function toggleDone(p: Project) {
    await fetch(`/api/projects/${p.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: p.name, description: p.description, color: p.color, lifeAreaId: p.lifeAreaId, done: !p.done }),
    })
    mutate()
  }

  async function deleteProject(p: Project) {
    if (!confirm(`Delete project "${p.name}"? Tasks will be unlinked.`)) return
    await fetch(`/api/projects/${p.id}`, { method: 'DELETE' })
    mutate()
  }

  const active = projects.filter(p => !p.done)
  const done = projects.filter(p => p.done)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Projects</h1>
        <button
          onClick={() => { setEditing(undefined); setShowForm(true) }}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          <Plus size={16} /> New project
        </button>
      </div>

      {active.length === 0 && done.length === 0 && (
        <p className="text-gray-400 dark:text-gray-500 text-sm">No projects yet.</p>
      )}

      <div className="flex flex-col gap-3">
        {active.map(p => (
          <ProjectCard
            key={p.id}
            project={p}
            openCount={openTasksByProject[p.id] ?? 0}
            onToggle={() => toggleDone(p)}
            onEdit={() => { setEditing(p); setShowForm(true) }}
            onDelete={() => deleteProject(p)}
          />
        ))}
      </div>

      {done.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-8 mb-3">
            Completed ({done.length})
          </h2>
          <div className="flex flex-col gap-2">
            {done.map(p => (
              <ProjectCard
                key={p.id}
                project={p}
                openCount={0}
                onToggle={() => toggleDone(p)}
                onEdit={() => { setEditing(p); setShowForm(true) }}
                onDelete={() => deleteProject(p)}
              />
            ))}
          </div>
        </>
      )}

      {showForm && (
        <Modal onClose={() => setShowForm(false)} title={editing ? 'Edit project' : 'New project'}>
          <ProjectForm
            initial={editing}
            onSave={() => { setShowForm(false); mutate() }}
            onCancel={() => setShowForm(false)}
          />
        </Modal>
      )}
    </div>
  )
}

function ProjectCard({
  project, openCount, onToggle, onEdit, onDelete,
}: {
  project: Project
  openCount: number
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className={`flex items-center gap-3 p-4 rounded-lg border ${project.done ? 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 opacity-60' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
      <button onClick={onToggle} className="text-gray-400 hover:text-green-500 shrink-0">
        {project.done ? <CheckCircle size={20} className="text-green-500" /> : <Circle size={20} />}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`font-medium text-sm ${project.done ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>
          {project.name}
        </div>
        {project.description && (
          <div className="text-xs text-gray-400 truncate mt-0.5">{project.description}</div>
        )}
        <div className="flex items-center gap-3 mt-1">
          {project.lifeArea && (
            <span className="text-xs px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: project.lifeArea.color }}>
              {project.lifeArea.name}
            </span>
          )}
          {openCount > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">{openCount} open task{openCount !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-blue-500 rounded"><Pencil size={14} /></button>
        <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500 rounded"><Trash2 size={14} /></button>
      </div>
    </div>
  )
}
