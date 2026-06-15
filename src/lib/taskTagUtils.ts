// src/lib/taskTagUtils.ts
export function parseTags(raw: string): string[] {
  return raw.split(',').map(t => t.trim()).filter(Boolean)
}

export function serializeTags(tags: string[]): string {
  return tags.join(',')
}
