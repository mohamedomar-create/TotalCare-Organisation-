import { RATING_DIMENSIONS } from './survey'
import type { Profile, Submission } from './types'

function cell(v: unknown) {
  const s = v === null || v === undefined ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function downloadCsv(subs: Submission[], profiles: Profile[], deptName: Map<string, string>) {
  const who = new Map(profiles.map((p) => [p.id, p]))
  const header = [
    'Name', 'Email', 'Department', 'Level', 'Status', 'Submitted at',
    ...RATING_DIMENSIONS.map((d) => d.label),
    'Responsibilities', 'Role notes', 'Challenges (ranked)', 'Challenge example',
    'Idea 1', 'Idea 2', 'Idea 3', 'Change tomorrow', 'eNPS (0-10)', 'Other comments', 'Boxes drawn',
  ]
  const rows = subs.map((s) => {
    const p = who.get(s.author_id)
    return [
      p?.full_name, p?.email, s.department_id ? deptName.get(s.department_id) : '', s.role_level, s.status, s.submitted_at,
      ...RATING_DIMENSIONS.map((d) => s.ratings?.[d.key] ?? ''),
      s.responsibility_tags.join('; '), s.responsibilities, s.challenge_tags.join('; '), s.challenges,
      s.ideas?.[0], s.ideas?.[1], s.ideas?.[2], s.quick_win, s.enps, s.suggestions, s.structure.nodes.length,
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
