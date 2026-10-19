import type { Department, ReportStats, Structure, Submission } from './types'
import { enps, ratingAverages, tagCounts } from './analytics'

// Departments with fewer submissions than this are merged into one group,
// so management can't work out who wrote what by elimination.
export const MIN_GROUP_SIZE = 3
const SMALL_GROUP = 'Other / smaller teams'

function shuffle<T>(items: T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function bullets(texts: string[]) {
  const clean = texts.map((t) => t.trim()).filter(Boolean)
  return clean.length ? shuffle(clean).map((t) => `- ${t.replace(/\s*\n\s*/g, ' ')}`).join('\n') : '- (nothing shared)'
}

// Builds an anonymised draft. The admin should read and edit it before publishing,
// e.g. to remove details in the text itself that could identify someone.
export function buildDraftReport(submissions: Submission[], departments: Department[]) {
  const submitted = submissions.filter((s) => s.status === 'submitted')
  const deptName = new Map(departments.map((d) => [d.id, d.name]))

  const groups = new Map<string, Submission[]>()
  for (const s of submitted) {
    const name = (s.department_id && deptName.get(s.department_id)) || 'Department not given'
    groups.set(name, [...(groups.get(name) ?? []), s])
  }
  const merged = new Map<string, Submission[]>()
  for (const [name, subs] of groups) {
    const key = subs.length < MIN_GROUP_SIZE ? SMALL_GROUP : name
    merged.set(key, [...(merged.get(key) ?? []), ...subs])
  }

  const stats: ReportStats = {
    total: submitted.length,
    byDepartment: [...merged].map(([name, subs]) => ({ name, count: subs.length })).sort((a, b) => b.count - a.count),
    ratings: ratingAverages(submitted),
    challenges: tagCounts(submitted.map((s) => s.challenge_tags)).slice(0, 10),
    enps: submitted.length >= MIN_GROUP_SIZE ? enps(submitted) : null,
  }

  const sections = [...merged]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, subs]) =>
      [
        `## ${name} (${subs.length} responses)`,
        '',
        '### Most-picked challenges',
        tagCounts(subs.map((s) => s.challenge_tags)).slice(0, 5).map((c) => `- ${c.label} (${c.count})`).join('\n') || '- (none picked)',
        '',
        '### Role clarity notes',
        bullets(subs.map((s) => s.responsibilities)),
        '',
        '### Challenge examples',
        bullets(subs.map((s) => s.challenges)),
        '',
        '### Ideas',
        bullets(subs.flatMap((s) => [s.quick_win, ...(s.ideas ?? []), s.suggestions])),
      ].join('\n'),
    )

  const summary = [
    `# Organisation feedback summary`,
    '',
    `${submitted.length} staff members shared their view. Responses are anonymised; groups with fewer than ${MIN_GROUP_SIZE} responses are combined.`,
    '',
    '## Key themes',
    '- (Admin: write the 3–5 main themes here before publishing.)',
    '',
    ...sections,
  ].join('\n')

  const structures: Structure[] = shuffle(submitted.map((s) => s.structure).filter((st) => st.nodes.length > 0))

  return { summary, stats, structures }
}
