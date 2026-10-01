/**
 * Shared SWR fetcher. Throws on a non-2xx response so SWR surfaces the server's
 * error instead of a JSON parse failure — the 40 inlined copies of this all
 * called r.json() unconditionally, so a 500 (which returns an HTML error page)
 * reached the UI as "SyntaxError: Unexpected token '<'".
 */
export class HttpError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'HttpError'
  }
}

export async function fetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new HttpError(await errorMessage(res), res.status)
  }
  return res.json() as Promise<T>
}

/** Pull the server's {error} message out of a failed response, if it has one. */
export async function errorMessage(res: Response): Promise<string> {
  const fallback = `${res.status} ${res.statusText}`.trim()
  try {
    const text = await res.text()
    if (!text) return fallback
    try {
      const parsed = JSON.parse(text) as { error?: unknown }
      if (typeof parsed.error === 'string' && parsed.error) return parsed.error
    } catch {
      // Not JSON — an HTML error page. Don't surface the markup.
    }
    return fallback
  } catch {
    return fallback
  }
}

/**
 * fetch + throw-on-error for mutations, so a failed POST/PUT/DELETE cannot be
 * mistaken for a success by a caller that ignores the status.
 */
export async function mutateJson<T = unknown>(url: string, init: RequestInit): Promise<T | null> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    ...init,
  })
  if (!res.ok) throw new HttpError(await errorMessage(res), res.status)
  if (res.status === 204) return null
  return res.json() as Promise<T>
}
