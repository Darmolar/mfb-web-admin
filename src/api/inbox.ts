// Work waiting for an admin, built from existing list endpoints (the backend has no admin notification feed).
// Each source loads on its own, so one failing or forbidden endpoint never hides the others.

export type InboxItem = { key: string; label: string; hint: string; count: number; to: string }
export type InboxSource = { key: string; label: string; hint: string; to: string; load: () => Promise<number> }
export type Inbox = { items: InboxItem[]; total: number; failed: string[] }

/** Runs every source in parallel and keeps those that answered; items with nothing waiting are dropped. */
export async function buildInbox(sources: InboxSource[]): Promise<Inbox> {
  const results = await Promise.allSettled(sources.map(s => s.load()))
  const items: InboxItem[] = []
  const failed: string[] = []
  results.forEach((r, i) => {
    const { key, label, hint, to } = sources[i]
    const item = { key, label, hint, to }
    if (r.status === 'rejected' || !Number.isFinite(r.value)) failed.push(item.label)
    else if (r.value > 0) items.push({ ...item, count: r.value })
  })
  return { items, total: items.reduce((n, i) => n + i.count, 0), failed }
}

/** Badge text: exact up to 99. */
export const badgeCount = (n: number) => (n > 99 ? '99+' : String(n))
