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
