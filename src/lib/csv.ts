import { CHECK_ITEMS, RATING_DIMENSIONS } from './survey'
import { themeScore } from './analytics'
import type { Profile, Submission } from './types'
import { asBoard } from './orgBoard'

function cell(v: unknown) {
  const s = v === null || v === undefined ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function downloadCsv(subs: Submission[], profiles: Profile[], deptName: Map<string, string>) {
  const who = new Map(profiles.map((p) => [p.id, p]))
  const header = [
    'Name', 'Email', 'Anonymous', 'Department', 'Level', 'Time at TotalCare', 'Based in', 'Status', 'Submitted at',
    ...RATING_DIMENSIONS.map((d) => d.label),
    ...CHECK_ITEMS.map((c) => `Check: ${c.question}`),
    'Answer quality (0-100)', 'In a year', 'Would help improve',
    'Responsibilities', 'Role notes', 'Challenges (ranked)', 'Challenge example',
    'Idea 1', 'Idea 2', 'Idea 3', 'Change tomorrow', 'eNPS (0-10)', 'Other comments', 'Roles on org chart',
  ]
  const rows = subs.map((s) => {
    const p = s.author_id ? who.get(s.author_id) : undefined
    return [
      s.anonymous ? 'Anonymous' : p?.full_name, s.anonymous ? '' : p?.email, s.anonymous ? 'yes' : 'no', s.department_id ? deptName.get(s.department_id) : '', s.role_level,
      s.answers?.tenure, s.answers?.location, s.status, s.submitted_at,
      ...RATING_DIMENSIONS.map((d) => { const v = themeScore(s.ratings, d.key); return v === null ? '' : Math.round(v * 10) / 10 }),
      ...CHECK_ITEMS.map((c) => s.ratings?.[c.key] ?? ''),
      s.quality?.score ?? '', s.answers?.stay, (s.answers?.volunteer ?? []).join('; '),
      s.responsibility_tags.join('; '), s.responsibilities, s.challenge_tags.join('; '), s.challenges,
      s.ideas?.[0], s.ideas?.[1], s.ideas?.[2], s.quick_win, s.enps, s.suggestions, asBoard(s.structure).roles.length,
    ]
  })
  const csv = [header, ...rows].map((r) => r.map(cell).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `totalcare-submissions-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
