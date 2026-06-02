# Documents Vault Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `/documents` page where users can upload, organize, preview, and download personal documents (passport, license, etc.) with expiry tracking and a dashboard widget for expiring documents.

**Architecture:** Files are stored on disk at `uploads/documents/` (UUID-based filenames), with metadata in SQLite via Prisma. Five API routes handle list/upload, metadata CRUD, and file streaming. The UI is a card grid with category filter pills, a detail modal with inline PDF/image preview, and an upload/edit form modal.

**Tech Stack:** Next.js 14 App Router, Prisma + SQLite (better-sqlite3 adapter), SWR, Tailwind CSS dark mode, Node.js `fs/promises` + `crypto.randomUUID`

---

## File Structure

**Create:**
- `src/app/documents/page.tsx` — Next.js page shell
- `src/app/api/documents/route.ts` — GET (list) + POST (upload, multipart/form-data)
- `src/app/api/documents/[id]/route.ts` — PUT (update metadata) + DELETE (remove file + record)
- `src/app/api/documents/[id]/file/route.ts` — GET (stream file, supports ?download=true)
- `src/components/documents/DocumentsPage.tsx` — main page: filter pills, card grid, modals
- `src/components/documents/DocumentCard.tsx` — single document card with expiry colour logic
- `src/components/documents/DocumentForm.tsx` — create / edit modal form
- `src/components/documents/DocumentDetailModal.tsx` — detail view: preview + download + edit + delete

**Modify:**
- `prisma/schema.prisma` — add `Document` model
- `src/types/index.ts` — add `Document` interface
- `.gitignore` — add `/uploads/` entry
- `src/components/Sidebar.tsx` — add Documents nav entry after Tasks
- `src/components/dashboard/DashboardPage.tsx` — add Expiring Documents widget

---

### Task 1: Prisma model + migration

**Files:**
- Modify: `prisma/schema.prisma`
- Auto-created: `prisma/migrations/<timestamp>_add_document/`

- [ ] **Step 1: Add the Document model to `prisma/schema.prisma`**

Append at the end of the file (after the `Appointment` model):

```prisma
model Document {
  id           Int      @id @default(autoincrement())
  name         String
  filename     String   @unique
  originalName String
  mimeType     String
  size         Int
  category     String
  notes        String?
  expiryDate   String?
  createdAt    DateTime @default(now())
}
```

- [ ] **Step 2: Run the migration**

```bash
npx prisma migrate dev --name add_document
```

Expected output: `The following migration(s) have been created and applied ... add_document`

- [ ] **Step 3: Regenerate the Prisma client**

```bash
npx prisma generate
```

Expected output: `✔ Generated Prisma Client`

- [ ] **Step 4: Add uploads directory to .gitignore**

Open `.gitignore` and append one line at the end:

```
/uploads/
```

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ .gitignore
git commit -m "feat: add Document prisma model and migration"
```

---

### Task 2: TypeScript type

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Append the Document interface to `src/types/index.ts`**

Add after the `Appointment` interface at the end of the file:

```typescript
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
  createdAt: string
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add Document TypeScript interface"
```

---

### Task 3: API — List + Upload

**Files:**
- Create: `src/app/api/documents/route.ts`

- [ ] **Step 1: Create `src/app/api/documents/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

const UPLOADS_DIR = join(process.cwd(), 'uploads', 'documents')

export async function GET() {
  const docs = await prisma.document.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(docs)
}

export async function POST(req: Request) {
  const form = await req.formData()
  const file = form.get('file') as File | null
  const name = form.get('name') as string | null
  const category = form.get('category') as string | null
  const notes = (form.get('notes') as string | null) || null
  const expiryDate = (form.get('expiryDate') as string | null) || null

  if (!file || !name || !category) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const originalExt = file.name.includes('.') ? '.' + file.name.split('.').pop()! : ''
  const filename = randomUUID() + originalExt

  await mkdir(UPLOADS_DIR, { recursive: true })
  const bytes = await file.arrayBuffer()
  await writeFile(join(UPLOADS_DIR, filename), Buffer.from(bytes))

  const doc = await prisma.document.create({
    data: {
      name,
      filename,
      originalName: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      category,
      notes,
      expiryDate,
    },
  })

  return NextResponse.json(doc, { status: 201 })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. Fix any type errors before proceeding.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/documents/route.ts
git commit -m "feat: add GET /api/documents and POST /api/documents (upload)"
```

---

### Task 4: API — Metadata update + Delete

**Files:**
- Create: `src/app/api/documents/[id]/route.ts`

- [ ] **Step 1: Create `src/app/api/documents/[id]/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import { join } from 'path'

const UPLOADS_DIR = join(process.cwd(), 'uploads', 'documents')

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id)
  const { name, category, notes, expiryDate } = await req.json()
  const doc = await prisma.document.update({
    where: { id },
    data: {
      name,
      category,
      notes: notes ?? null,
      expiryDate: expiryDate ?? null,
    },
  })
  return NextResponse.json(doc)
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id)
  const doc = await prisma.document.findUnique({ where: { id } })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    await unlink(join(UPLOADS_DIR, doc.filename))
  } catch {
    // file already missing — proceed with DB delete
  }

  await prisma.document.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/documents/[id]/route.ts
git commit -m "feat: add PUT and DELETE /api/documents/[id]"
```

---

### Task 5: API — File serving

**Files:**
- Create: `src/app/api/documents/[id]/file/route.ts`

- [ ] **Step 1: Create `src/app/api/documents/[id]/file/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readFile } from 'fs/promises'
import { join } from 'path'

const UPLOADS_DIR = join(process.cwd(), 'uploads', 'documents')

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id)
  const doc = await prisma.document.findUnique({ where: { id } })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let buffer: Buffer
  try {
    buffer = await readFile(join(UPLOADS_DIR, doc.filename))
  } catch {
    return NextResponse.json({ error: 'File not found on disk' }, { status: 404 })
  }

  const url = new URL(req.url)
  const download = url.searchParams.get('download') === 'true'

  const headers: Record<string, string> = {
    'Content-Type': doc.mimeType,
    'Content-Length': String(buffer.length),
  }
  if (download) {
    headers['Content-Disposition'] = `attachment; filename="${doc.originalName}"`
  }

  return new Response(buffer, { headers })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/documents/[id]/file/route.ts
git commit -m "feat: add GET /api/documents/[id]/file (stream with download support)"
```

---

### Task 6: DocumentForm component

**Files:**
- Create: `src/components/documents/DocumentForm.tsx`

- [ ] **Step 1: Create `src/components/documents/DocumentForm.tsx`**

```typescript
'use client'

import { useState } from 'react'
import type { Document } from '@/types'

const CATEGORIES = ['Identity', 'Finance', 'Vehicle', 'Health', 'Insurance', 'Other']

const inputCls =
  'w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'

interface Props {
  initial?: Document
  onSave: () => void
  onCancel: () => void
}

export default function DocumentForm({ initial, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState(initial?.category ?? 'Other')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [expiryDate, setExpiryDate] = useState(initial?.expiryDate ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    if (!name) {
      setName(f.name.replace(/\.[^/.]+$/, ''))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (initial) {
        await fetch(`/api/documents/${initial.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            category,
            notes: notes || null,
            expiryDate: expiryDate || null,
          }),
        })
      } else {
        if (!file) return
        const form = new FormData()
        form.append('file', file)
        form.append('name', name)
        form.append('category', category)
        if (notes) form.append('notes', notes)
        if (expiryDate) form.append('expiryDate', expiryDate)
        await fetch('/api/documents', { method: 'POST', body: form })
      }
      onSave()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {initial ? 'Edit Document' : 'Upload Document'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
          >
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {!initial && (
            <div>
              <label className={labelCls}>File *</label>
              <input
                type="file"
                required
                onChange={handleFileChange}
                className="w-full text-sm text-gray-700 dark:text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300"
              />
            </div>
          )}
          <div>
            <label className={labelCls}>Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Category *</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className={inputCls}
            >
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Expiry Date</label>
            <input
              type="date"
              value={expiryDate}
              onChange={e => setExpiryDate(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className={inputCls}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || (!initial && !file)}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : initial ? 'Save' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/documents/DocumentForm.tsx
git commit -m "feat: add DocumentForm upload/edit modal"
```

---

### Task 7: DocumentCard component

**Files:**
- Create: `src/components/documents/DocumentCard.tsx`

- [ ] **Step 1: Create `src/components/documents/DocumentCard.tsx`**

```typescript
'use client'

import type { Document } from '@/types'

export const CATEGORY_COLOR: Record<string, string> = {
  Identity: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Finance: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  Vehicle: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  Health: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  Insurance: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  Other: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function expiryStatus(
  expiryDate: string | null
): { label: string; cls: string } | null {
  if (!expiryDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const exp = new Date(expiryDate + 'T00:00:00')
  const days = Math.round((exp.getTime() - today.getTime()) / 86400000)
  if (days < 0) return { label: 'Expired', cls: 'text-red-600 dark:text-red-400' }
  if (days <= 30) return { label: `${days}d left`, cls: 'text-red-600 dark:text-red-400' }
  if (days <= 90) return { label: `${days}d left`, cls: 'text-orange-500 dark:text-orange-400' }
  return { label: expiryDate, cls: 'text-gray-400 dark:text-gray-500' }
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType === 'application/pdf') return <span className="text-2xl">📄</span>
  if (mimeType.startsWith('image/')) return <span className="text-2xl">🖼</span>
  return <span className="text-2xl">📁</span>
}

interface Props {
  doc: Document
  onClick: () => void
}

export default function DocumentCard({ doc, onClick }: Props) {
  const expiry = expiryStatus(doc.expiryDate)
  const catCls = CATEGORY_COLOR[doc.category] ?? CATEGORY_COLOR.Other

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-shadow flex flex-col gap-2"
    >
      <div className="flex items-start gap-3">
        <FileIcon mimeType={doc.mimeType} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{doc.name}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{formatSize(doc.size)}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${catCls}`}>
          {doc.category}
        </span>
        {expiry && (
          <span className={`text-xs font-medium ${expiry.cls}`}>{expiry.label}</span>
        )}
      </div>
    </button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/documents/DocumentCard.tsx
git commit -m "feat: add DocumentCard component with expiry colour logic"
```

---

### Task 8: DocumentDetailModal component

**Files:**
- Create: `src/components/documents/DocumentDetailModal.tsx`

- [ ] **Step 1: Create `src/components/documents/DocumentDetailModal.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { mutate } from 'swr'
import type { Document } from '@/types'
import DocumentForm from './DocumentForm'
import { CATEGORY_COLOR, formatSize } from './DocumentCard'

interface Props {
  doc: Document
  onClose: () => void
}

export default function DocumentDetailModal({ doc, onClose }: Props) {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const catCls = CATEGORY_COLOR[doc.category] ?? CATEGORY_COLOR.Other
  const fileUrl = `/api/documents/${doc.id}/file`
  const isPdf = doc.mimeType === 'application/pdf'
  const isImage = doc.mimeType.startsWith('image/')

  async function handleDelete() {
    if (!confirm(`Delete "${doc.name}"? This cannot be undone.`)) return
    setDeleting(true)
    await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' })
    mutate('/api/documents')
    onClose()
  }

  if (editing) {
    return (
      <DocumentForm
        initial={doc}
        onSave={() => { mutate('/api/documents'); onClose() }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{doc.name}</h2>
            <span className={`shrink-0 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${catCls}`}>
              {doc.category}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none ml-4"
          >
            &times;
          </button>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-auto p-4">
          {isPdf && (
            <iframe
              src={fileUrl}
              className="w-full h-96 rounded border border-gray-200 dark:border-gray-700"
              title={doc.name}
            />
          )}
          {isImage && (
            <img
              src={fileUrl}
              alt={doc.name}
              className="max-w-full max-h-96 mx-auto rounded border border-gray-200 dark:border-gray-700 object-contain"
            />
          )}
          {!isPdf && !isImage && (
            <div className="flex items-center justify-center h-32 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
              <p className="text-sm text-gray-500 dark:text-gray-400">No preview available</p>
            </div>
          )}

          {/* Metadata */}
          <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex gap-2">
              <span className="font-medium text-gray-900 dark:text-white w-24 shrink-0">File:</span>
              {doc.originalName} ({formatSize(doc.size)})
            </div>
            {doc.expiryDate && (
              <div className="flex gap-2">
                <span className="font-medium text-gray-900 dark:text-white w-24 shrink-0">Expires:</span>
                {doc.expiryDate}
              </div>
            )}
            {doc.notes && (
              <div className="flex gap-2">
                <span className="font-medium text-gray-900 dark:text-white w-24 shrink-0">Notes:</span>
                {doc.notes}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md disabled:opacity-50"
          >
            Delete
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
            >
              Edit
            </button>
            <a
              href={`${fileUrl}?download=true`}
              download
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Download
            </a>
          </div>
        </div>

      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/documents/DocumentDetailModal.tsx
git commit -m "feat: add DocumentDetailModal with inline preview and actions"
```

---

### Task 9: DocumentsPage component

**Files:**
- Create: `src/components/documents/DocumentsPage.tsx`

- [ ] **Step 1: Create `src/components/documents/DocumentsPage.tsx`**

```typescript
'use client'

import { useState } from 'react'
import useSWR from 'swr'
import type { Document } from '@/types'
import DocumentCard from './DocumentCard'
import DocumentForm from './DocumentForm'
import DocumentDetailModal from './DocumentDetailModal'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const FILTER_CATEGORIES = ['All', 'Identity', 'Finance', 'Vehicle', 'Health', 'Insurance', 'Other']

export default function DocumentsPage() {
  const { data: docs = [], mutate } = useSWR<Document[]>('/api/documents', fetcher)
  const [filter, setFilter] = useState('All')
  const [uploading, setUploading] = useState(false)
  const [selected, setSelected] = useState<Document | null>(null)

  const filtered = filter === 'All' ? docs : docs.filter(d => d.category === filter)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Documents Vault</h1>
        <button
          onClick={() => setUploading(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          + Upload
        </button>
      </div>

      {/* Category filter pills */}
      <div className="flex gap-2 flex-wrap mb-6">
        {FILTER_CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 text-sm rounded-full font-medium transition-colors ${
              filter === cat
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Document grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600 text-sm">
          {filter === 'All'
            ? 'No documents yet. Click "+ Upload" to add your first document.'
            : `No ${filter} documents.`}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(doc => (
            <DocumentCard key={doc.id} doc={doc} onClick={() => setSelected(doc)} />
          ))}
        </div>
      )}

      {/* Upload modal */}
      {uploading && (
        <DocumentForm
          onSave={() => { mutate(); setUploading(false) }}
          onCancel={() => setUploading(false)}
        />
      )}

      {/* Detail modal */}
      {selected && (
        <DocumentDetailModal
          doc={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/documents/DocumentsPage.tsx
git commit -m "feat: add DocumentsPage with filter pills and card grid"
```

---

### Task 10: Page shell + Sidebar

**Files:**
- Create: `src/app/documents/page.tsx`
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Create `src/app/documents/page.tsx`**

```typescript
import DocumentsPage from '@/components/documents/DocumentsPage'

export default function Page() {
  return <DocumentsPage />
}
```

- [ ] **Step 2: Add Documents to Sidebar**

In `src/components/Sidebar.tsx`, find the Tasks nav entry and add Documents immediately after it:

```typescript
  { href: '/tasks', label: 'Tasks', active: true },
  { href: '/documents', label: 'Documents', active: true },
```

The surrounding context for the edit:

```typescript
  { href: '/tasks', label: 'Tasks', active: true },
  { href: '/maintenance', label: 'Maintenance', active: true },
```

Replace with:

```typescript
  { href: '/tasks', label: 'Tasks', active: true },
  { href: '/documents', label: 'Documents', active: true },
  { href: '/maintenance', label: 'Maintenance', active: true },
```

- [ ] **Step 3: Commit**

```bash
git add src/app/documents/page.tsx src/components/Sidebar.tsx
git commit -m "feat: add /documents page shell and sidebar entry"
```

---

### Task 11: Dashboard widget — Expiring Documents

**Files:**
- Modify: `src/components/dashboard/DashboardPage.tsx`

- [ ] **Step 1: Add Document import to the types import line**

Find this line in `src/components/dashboard/DashboardPage.tsx`:

```typescript
import type { Habit, LifeArea, GiftPerson, Appointment } from '@/types'
```

Replace with:

```typescript
import type { Habit, LifeArea, GiftPerson, Appointment, Document } from '@/types'
```

- [ ] **Step 2: Add DOCUMENT_CATEGORY_COLOR constant**

After the existing `APPT_CATEGORY_COLOR` constant (around line 11–16), add:

```typescript
const DOC_CATEGORY_COLOR: Record<string, string> = {
  Identity: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Finance: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Vehicle: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Health: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Insurance: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Other: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
}
```

- [ ] **Step 3: Add the SWR fetch and expiring docs derivation inside DashboardPage**

In the `DashboardPage` function, after the existing `const { data: appointments = [] ...` line, add:

```typescript
  const { data: allDocs = [], isLoading: docsLoading } = useSWR<Document[]>('/api/documents', fetcher)

  // ── Documents widget ──
  const in90Days = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)
  const expiringDocs = allDocs
    .filter(d => d.expiryDate != null && d.expiryDate <= in90Days)
    .sort((a, b) => (a.expiryDate ?? '').localeCompare(b.expiryDate ?? ''))
    .slice(0, 5)
```

- [ ] **Step 4: Add the Expiring Documents WidgetCard**

In the JSX, after the closing `</WidgetCard>` of the "Upcoming Appointments" widget and before the closing `</div>` of the grid, add:

```typescript
        {/* Expiring Documents */}
        <WidgetCard title="Expiring Documents">
          {docsLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : expiringDocs.length === 0 ? (
            <p className="text-sm text-gray-400">No documents expiring soon.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {expiringDocs.map(d => {
                const now = new Date()
                now.setHours(0, 0, 0, 0)
                const exp = new Date(d.expiryDate! + 'T00:00:00')
                const days = Math.round((exp.getTime() - now.getTime()) / 86400000)
                return (
                  <a key={d.id} href="/documents" className="flex items-center justify-between gap-2 hover:opacity-80">
                    <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{d.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${DOC_CATEGORY_COLOR[d.category] ?? DOC_CATEGORY_COLOR.Other}`}>
                        {d.category}
                      </span>
                      <span className={`text-xs font-medium ${days < 0 ? 'text-red-500' : days <= 30 ? 'text-red-500' : 'text-orange-500'}`}>
                        {days < 0 ? 'Expired' : `${days}d`}
                      </span>
                    </div>
                  </a>
                )
              })}
            </div>
          )}
        </WidgetCard>
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/DashboardPage.tsx
git commit -m "feat: add Expiring Documents dashboard widget"
```

---

### Task 12: Manual verification

**Files:** none (runtime check only)

- [ ] **Step 1: Start the dev server (kill any existing instance first)**

```bash
# Kill anything on port 4100 if needed
fuser -k 4100/tcp 2>/dev/null || true
npx next dev -p 4100
```

- [ ] **Step 2: Verify upload flow**

1. Open `http://localhost:4100/documents`
2. Click "+ Upload"
3. Select a PDF file — confirm the display name auto-populates from the filename
4. Set Category = Identity, add an expiry date 2 weeks from today
5. Click Upload — confirm the modal closes and the card appears in the grid
6. Confirm the card shows the category badge and expiry date in red (< 30 days)

- [ ] **Step 3: Verify detail modal**

1. Click the card
2. Confirm the PDF renders inline in the iframe
3. Click Download — confirm the file downloads with the original filename
4. Click Edit — change the name, save — confirm the card updates

- [ ] **Step 4: Verify category filter**

1. Upload a second document with Category = Finance
2. Click the "Identity" filter pill — confirm only the first document shows
3. Click "All" — confirm both show

- [ ] **Step 5: Verify delete**

1. Open any document's detail modal
2. Click Delete, confirm the prompt
3. Confirm the modal closes and the card disappears
4. Confirm the file is gone: `ls uploads/documents/`

- [ ] **Step 6: Verify dashboard widget**

1. Open `http://localhost:4100`
2. Confirm the "Expiring Documents" widget appears and lists the document uploaded in Step 2
3. Upload a document with an expiry date 6 months from today — confirm it does NOT appear in the widget (>90 days)

- [ ] **Step 7: Verify sidebar**

Confirm "Documents" appears in the sidebar between "Tasks" and "Maintenance", and clicking it navigates to `/documents`.
