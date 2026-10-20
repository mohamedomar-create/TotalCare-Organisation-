import { RATING_DIMENSIONS } from './survey'
import type { Submission } from './types'

export function ratingAverages(subs: Submission[]) {
  return RATING_DIMENSIONS.map((d) => {
    const values = subs.map((s) => s.ratings?.[d.key]).filter((v): v is number => typeof v === 'number')
    const average = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
    return { key: d.key, label: d.label, average: Math.round(average * 10) / 10, count: values.length }
  })
}

export function tagCounts(lists: string[][]) {
  const counts = new Map<string, number>()
  for (const list of lists) for (const t of list) counts.set(t, (counts.get(t) ?? 0) + 1)
  return [...counts].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

// Employee Net Promoter Score: % promoters (9–10) minus % detractors (0–6), from −100 to +100.
export function enps(subs: Submission[]) {
  const scores = subs.map((s) => s.enps).filter((v): v is number => typeof v === 'number')
  if (scores.length === 0) return null
  const promoters = scores.filter((v) => v >= 9).length
  const detractors = scores.filter((v) => v <= 6).length
  return { score: Math.round(((promoters - detractors) / scores.length) * 100), count: scores.length }
}

// Average of all answered ratings, 1–5 (null when nobody answered).
export function overallAverage(subs: Submission[]) {
  const values = subs.flatMap((s) => Object.values(s.ratings ?? {})).filter((v): v is number => typeof v === 'number')
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null
}

// Organisation health index: the overall average on a 0–100 scale.
export const healthIndex = (avg: number | null) => (avg === null ? null : Math.round(((avg - 1) / 4) * 100))

export type Band = 'good' | 'watch' | 'attention'
export const bandFor = (avg: number): Band => (avg >= 3.75 ? 'good' : avg >= 3 ? 'watch' : 'attention')
export const BAND_LABEL: Record<Band, string> = { good: 'Healthy', watch: 'Watch', attention: 'Needs attention' }

export function enpsSplit(subs: Submission[]) {
  const scores = subs.map((s) => s.enps).filter((v): v is number => typeof v === 'number')
  const promoters = scores.filter((v) => v >= 9).length
  const detractors = scores.filter((v) => v <= 6).length
  return { total: scores.length, promoters, passives: scores.length - promoters - detractors, detractors }
}

// Submissions per week for the last `weeks` weeks (oldest first).
export function weeklyCounts(subs: Submission[], weeks = 8) {
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - start.getDay()) // Sunday, the start of the Egyptian work week
  return Array.from({ length: weeks }, (_, i) => {
    const from = new Date(start)
    from.setDate(from.getDate() - (weeks - 1 - i) * 7)
    const to = new Date(from)
    to.setDate(to.getDate() + 7)
    const count = subs.filter((s) => s.submitted_at && new Date(s.submitted_at) >= from && new Date(s.submitted_at) < to).length
    return { label: from.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), count }
  })
}
