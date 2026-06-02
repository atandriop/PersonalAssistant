# Documents Vault — Design Spec

**Date:** 2026-06-02
**Status:** Approved

---

## Overview

A `/documents` page for storing and organizing personal documents (passport, driver's license, insurance, etc.). Files are stored on the local filesystem and served via API. Each document has optional expiry tracking with visual warnings. Expiring documents surface on the home dashboard.

---

## Data Model

### Document

| Field | Type | Notes |
|---|---|---|
| `id` | Int PK | |
| `name` | String | User-facing display name (e.g. "My Passport") |
| `filename` | String | UUID-based stored filename on disk (e.g. `a3f2c1d0.pdf`) |
| `originalName` | String | Original upload filename |
| `mimeType` | String | `application/pdf`, `image/jpeg`, `image/png`, etc. |
| `size` | Int | File size in bytes |
| `category` | String | Identity / Finance / Vehicle / Health / Insurance / Other |
| `notes` | String? | Optional free-text notes |
| `expiryDate` | String? | YYYY-MM-DD — optional expiry date |
| `createdAt` | DateTime | Default now() |

Files are stored in `uploads/documents/` at the project root (outside `public/`). The stored filename is a UUID + original extension, generated at upload time (e.g. `550e8400-e29b-41d4-a716-446655440000.pdf`). This avoids collisions and prevents filename-based enumeration.

---

## API Routes

| Method | Path | Description |
|---|---|---|
| GET | `/api/documents` | List all documents (metadata only, ordered by `createdAt` desc) |
| POST | `/api/documents` | Upload file + metadata via `multipart/form-data` |
| PUT | `/api/documents/[id]` | Update metadata (name, category, notes, expiryDate) |
| DELETE | `/api/documents/[id]` | Delete DB record and remove file from disk |
| GET | `/api/documents/[id]/file` | Stream file with correct `Content-Type` |

### Upload (`POST /api/documents`)

- Uses `request.formData()` — no body-parser library needed (native in Next.js 14)
- Route must export `export const dynamic = 'force-dynamic'`
- Reads the `File` from the form data, generates a UUID filename, writes to `uploads/documents/`
- Creates the Prisma `Document` record after the file is written
- Returns the created document as JSON with status 201

### File Serving (`GET /api/documents/[id]/file`)

- Looks up the document record to get the stored `filename`
- Reads the file from `uploads/documents/<filename>`
- Returns a `Response` with `Content-Type` set to the stored `mimeType`
- If `?download=true` query param is present, adds `Content-Disposition: attachment; filename="<originalName>"` header so the browser downloads instead of rendering inline

### Metadata Update (`PUT /api/documents/[id]`)

- Accepts `name`, `category`, `notes`, `expiryDate` in JSON body
- Does not accept a new file — re-upload requires delete + new upload
- Returns updated document

### Delete (`DELETE /api/documents/[id]`)

- Removes the file from disk (`uploads/documents/<filename>`)
- Deletes the Prisma record
- Returns 204 No Content

---

## Page: `/documents`

**File structure:**
- `src/app/documents/page.tsx` — Next.js page shell
- `src/components/documents/DocumentsPage.tsx` — main component
- `src/components/documents/DocumentCard.tsx` — individual document card
- `src/components/documents/DocumentForm.tsx` — upload/edit modal form
- `src/components/documents/DocumentDetailModal.tsx` — detail view modal (preview + actions)

---

## Documents Page

### Layout

- **Top bar:** "Documents Vault" heading (left), "+ Upload" button (right)
- **Category filter pills:** All | Identity | Finance | Vehicle | Health | Insurance | Other — selecting a pill filters the grid client-side; "All" is selected by default
- **Document grid:** responsive grid (1 column on mobile, 3–4 on desktop) of `DocumentCard` components

### Document Card

Each card displays:
- **File type icon** — PDF icon for `application/pdf`, image icon for `image/*`, generic file icon for everything else
- **Display name** (bold)
- **Category badge** (color-coded pill)
- **File size** formatted (e.g. "2.3 MB")
- **Expiry date** — shown only when `expiryDate` is set:
  - Red + warning icon if expiring within 30 days
  - Orange if expiring within 31–90 days
  - Gray (muted) if more than 90 days out
  - If already expired, shown in red with "Expired" label
- Clicking the card opens the **Detail Modal**

### Category Badge Colors

| Category | Color |
|---|---|
| Identity | Blue |
| Finance | Green |
| Vehicle | Orange |
| Health | Red |
| Insurance | Purple |
| Other | Gray |

### Detail Modal

Opens when a card is clicked. Contains:

- **Inline preview** (top):
  - PDF: `<iframe>` pointing at `/api/documents/[id]/file` — browser renders inline
  - Image (`image/*`): `<img>` tag pointing at `/api/documents/[id]/file`
  - Other types: a generic "No preview available" message
- **Metadata block:** name, category badge, file size, expiry date, notes
- **Action buttons:**
  - "Download" — links to `/api/documents/[id]/file?download=true`
  - "Edit" — opens the Edit form modal (closes detail modal)
  - "Delete" — confirmation prompt, then DELETE request; closes modal and refreshes list

### Upload Form (modal)

Shown when "+ Upload" is clicked. Fields:
- **File picker** (required) — accepts all file types
- **Display name** (required, text input) — pre-populated from the filename on file selection, editable
- **Category** (required, select) — Identity / Finance / Vehicle / Health / Insurance / Other
- **Expiry date** (optional, date input)
- **Notes** (optional, textarea)

On submit: POST to `/api/documents` as `multipart/form-data`. Closes modal and refreshes list on success.

### Edit Form (modal)

Same form as Upload but without the file picker (file cannot be changed after upload). Pre-filled with existing values. Submits PUT to `/api/documents/[id]`.

---

## Sidebar

Add one entry to `NAV` in `Sidebar.tsx`:

```ts
{ href: '/documents', label: 'Documents', active: true }
```

Positioned after Tasks.

---

## Dashboard Widget

On `DashboardPage.tsx`: a card titled **"Expiring Documents"** showing documents with `expiryDate` set, that expire within the next 90 days (including already-expired), sorted by `expiryDate` ascending, capped at 5 entries.

Each entry shows:
- Document name
- Category badge
- Days remaining (e.g. "12 days", or "Expired" in red if past due)

Clicking any entry navigates to `/documents`.

The dashboard fetches document metadata from `GET /api/documents` and filters/sorts client-side.

---

## Scope Notes

- No authentication or access control — this is a local personal app.
- File type is not restricted on upload — the user is responsible for what they upload.
- Re-uploading a document (replacing the file) is not supported — delete and re-upload instead.
- The `uploads/documents/` directory is created at runtime by the upload route if it does not exist (`fs.mkdirSync(..., { recursive: true })`).
- No thumbnail generation. PDF preview relies on the browser's built-in PDF renderer via `<iframe>`.
