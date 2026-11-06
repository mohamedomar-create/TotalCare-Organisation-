// Results of the department survey (answers v2).
import { SURVEY_DEPARTMENTS, deptByKey, type SurveyAnswers } from './survey'
import { normalize } from './quality'
import type { Submission } from './types'

export const isV2 = (s: Submission) => Boolean((s.answers as SurveyAnswers | undefined)?.v === 2)
const ans = (s: Submission) => (s.answers ?? {}) as SurveyAnswers

export interface Comment {
  text: string
  /** the respondent's own department, for context (never a name) */
  fromDept: string
  self: boolean
  submission: string
}

export interface DeptResult {
  key: string
  name: string
  ar: string
  emoji: string
  color: string
  /** average from other departments (self-ratings excluded) */
  average: number | null
  n: number
  selfAverage: number | null
  selfN: number
  /** % of 9–10 minus % of 1–6, like an NPS for the department */
  nps: number | null
  distribution: number[] // index 0 = score 1
  skips: number
  strengths: Comment[]
  weaknesses: Comment[]
  ideas: Comment[]
}

const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null)

function fromLabel(s: Submission) {
  const k = ans(s).my_dept
  return deptByKey(k ?? '')?.name ?? (k === 'management' ? 'Management' : k ? 'Other' : 'Not given')
}

export function departmentResults(subs: Submission[]): DeptResult[] {
  return SURVEY_DEPARTMENTS.map((d) => {
    const others: number[] = []
    const self: number[] = []
    const distribution = Array(10).fill(0) as number[]
    let skips = 0
    const strengths: Comment[] = []
    const weaknesses: Comment[] = []
    const ideas: Comment[] = []
    for (const s of subs) {
      const a = ans(s)
      const r = a.depts?.[d.key]
      if (!r) continue
      if (r.skip) {
        skips++
        continue
      }
      const isSelf = a.my_dept === d.key
      if (typeof r.score === 'number') {
        ;(isSelf ? self : others).push(r.score)
        if (!isSelf) distribution[r.score - 1]++
      }
      const c = (text?: string) => (text?.trim() ? { text: text.trim(), fromDept: fromLabel(s), self: isSelf, submission: s.id } : null)
      const st = c(r.strengths)
      const wk = c(r.weaknesses)
      const id = c(r.ideas)
      if (st) strengths.push(st)
      if (wk) weaknesses.push(wk)
      if (id) ideas.push(id)
    }
    const promoters = others.filter((v) => v >= 9).length
    const detractors = others.filter((v) => v <= 6).length
    return {
      ...d,
      average: avg(others),
      n: others.length,
      selfAverage: avg(self),
      selfN: self.length,
      nps: others.length ? Math.round(((promoters - detractors) / others.length) * 100) : null,
      distribution,
      skips,
      strengths,
      weaknesses,
      ideas,
    }
  })
}

export interface Ranked {
  key: string
  label: string
  /** 3 points for a 1st place, 2 for 2nd, 1 for 3rd */
  points: number
  firsts: number
  votes: number
}

/** Ranks names or department keys from top-3 lists. Spelling variants of the same name are merged. */
export function rankNominations(lists: string[][], labelFor: (raw: string) => string = (x) => x): Ranked[] {
  const map = new Map<string, Ranked & { spellings: Map<string, number> }>()
  for (const list of lists) {
    list.forEach((raw, i) => {
      if (!raw?.trim() || i > 2) return
      const key = normalize(raw)
      if (!key) return
      const r = map.get(key) ?? { key, label: '', points: 0, firsts: 0, votes: 0, spellings: new Map() }
      r.points += 3 - i
      r.votes++
      if (i === 0) r.firsts++
      r.spellings.set(raw.trim(), (r.spellings.get(raw.trim()) ?? 0) + 1)
      map.set(key, r)
    })
  }
  return [...map.values()]
    .map(({ spellings, ...r }) => ({ ...r, label: labelFor([...spellings].sort((a, b) => b[1] - a[1])[0][0]) }))
    .sort((a, b) => b.points - a.points || b.firsts - a.firsts || a.label.localeCompare(b.label))
}

export function nominations(subs: Submission[]) {
  return {
    managers: rankNominations(subs.map((s) => (ans(s).best_managers ?? []).map((n) => n.name))),
    departments: rankNominations(subs.map((s) => ans(s).best_departments ?? []), (k) => deptByKey(k)?.name ?? k),
    employees: rankNominations(subs.map((s) => (ans(s).best_employees ?? []).map((n) => n.name))),
  }
}

/** Reasons people gave for a nominee (to explain the award). */
export function reasonsFor(subs: Submission[], field: 'best_managers' | 'best_employees', key: string) {
  return subs.flatMap((s) => (ans(s)[field] ?? []).filter((n) => normalize(n.name) === key && n.reason?.trim()).map((n) => n.reason!.trim()))
}

export interface Grouped {
  text: string
  count: number
}

/** Groups short answers that are the same after normalising; most frequent first. */
export function groupAnswers(lists: string[][]): Grouped[] {
  const map = new Map<string, { text: string; count: number; spellings: Map<string, number> }>()
  for (const list of lists) {
    for (const raw of list) {
      const t = raw?.trim()
      if (!t) continue
      const key = normalize(t)
      const g = map.get(key) ?? { text: t, count: 0, spellings: new Map() }
      g.count++
      g.spellings.set(t, (g.spellings.get(t) ?? 0) + 1)
      map.set(key, g)
    }
  }
  return [...map.values()]
    .map((g) => ({ text: [...g.spellings].sort((a, b) => b[1] - a[1])[0][0], count: g.count }))
    .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text))
}

export function companyResults(subs: Submission[]) {
  return {
    problems: groupAnswers(subs.map((s) => ans(s).company_problems ?? [])),
    strengths: groupAnswers(subs.map((s) => ans(s).company_strengths ?? [])),
  }
}

export interface IdeaRow {
  text: string
  source: string // "Company" or a department name
  fromDept: string
  submission: string
  anonymous: boolean
  rewardCode?: string
}

export function allIdeas(subs: Submission[]): IdeaRow[] {
  const out: IdeaRow[] = []
  for (const s of subs) {
    const a = ans(s)
    for (const t of a.company_ideas ?? []) if (t?.trim()) out.push({ text: t.trim(), source: 'Company', fromDept: fromLabel(s), submission: s.id, anonymous: Boolean(s.anonymous), rewardCode: a.reward_code })
    for (const [k, r] of Object.entries(a.depts ?? {})) if (r.ideas?.trim()) out.push({ text: r.ideas.trim(), source: deptByKey(k)?.name ?? k, fromDept: fromLabel(s), submission: s.id, anonymous: Boolean(s.anonymous), rewardCode: a.reward_code })
  }
  return out
}

/* ===================== Dashboard analytics ===================== */

/** Groups smaller than this are never shown on their own, so nobody can be singled out. */
export const MIN_GROUP = 3

export interface Segment {
  dept?: string
  level?: string
  tenure?: string
  location?: string
  mode?: 'named' | 'anonymous'
}

export function applySegment(subs: Submission[], seg: Segment) {
  return subs.filter((s) => {
    const a = ans(s)
    if (seg.dept && a.my_dept !== seg.dept) return false
    if (seg.level && s.role_level !== seg.level) return false
    if (seg.tenure && a.tenure !== seg.tenure) return false
    if (seg.location && a.location !== seg.location) return false
    if (seg.mode === 'anonymous' && !s.anonymous) return false
    if (seg.mode === 'named' && s.anonymous) return false
    return true
  })
}

/** All scores people gave to departments other than their own. */
function otherScores(subs: Submission[]) {
  return subs.flatMap((s) => {
    const a = ans(s)
    return Object.entries(a.depts ?? {}).filter(([k, r]) => !r.skip && typeof r.score === 'number' && k !== a.my_dept).map(([, r]) => r.score!)
  })
}

/** Company score: average of all department scores (out of 10) and the same on a 0–100 index. */
export function companyScore(subs: Submission[]) {
  const xs = otherScores(subs)
  const average = avg(xs)
  return { average, index: average === null ? null : Math.round(((average - 1) / 9) * 100), n: xs.length }
}

export interface MatrixCell {
  average: number | null
  n: number
  self: boolean
  hidden: boolean
}

/** Who rates whom: rows are the respondents' departments, columns the rated departments. */
export function crossMatrix(subs: Submission[]) {
  const rows = SURVEY_DEPARTMENTS.map((from) => {
    const group = subs.filter((s) => ans(s).my_dept === from.key)
    const cells: MatrixCell[] = SURVEY_DEPARTMENTS.map((to) => {
      const xs = group.map((s) => ans(s).depts?.[to.key]).filter((r) => r && !r.skip && typeof r.score === 'number').map((r) => r!.score!)
      return { average: avg(xs), n: xs.length, self: from.key === to.key, hidden: xs.length > 0 && xs.length < MIN_GROUP }
    })
    return { from, n: group.length, cells }
  })
  return rows.filter((r) => r.n > 0)
}

/** Simple keyword themes in English and Egyptian Arabic, to sort free-text praise and complaints. */
export const THEMES: { key: string; label: string; ar: string; words: RegExp }[] = [
  { key: 'speed', label: 'Speed & delays', ar: 'السرعة والتأخير', words: /slow|late|delay|wait|fast|quick|speed|time|بطء|بطيء|تأخير|متأخر|اتأخر|تاخير|سريع|بسرعة|سرعة|وقت|مستني|انتظار/i },
  { key: 'communication', label: 'Communication & follow-up', ar: 'التواصل والمتابعة', words: /communicat|repl|respond|answer|phone|call|follow|inform|update|تواصل|رد|بيرد|ردود|تليفون|متابعة|بيتابع|معلومة|بلغ|يبلغ/i },
  { key: 'approvals', label: 'Approvals & paperwork', ar: 'الموافقات والورق', words: /approv|sign|paper|document|bureau|routine|موافق|توقيع|توقيعات|ورق|مستند|روتين|امضا|إمضاء/i },
  { key: 'payments', label: 'Payments & money', ar: 'المدفوعات والفلوس', words: /pay|collect|cash|invoice|money|price|salar|دفع|تحصيل|فلوس|فاتور|سعر|اسعار|أسعار|مرتب|مستحقات/i },
  { key: 'stock', label: 'Stock & spare parts', ar: 'المخزون وقطع الغيار', words: /stock|spare|part|warehouse|inventor|deliver|shipment|مخزون|مخزن|قطع|غيار|توريد|شحن|توصيل|بضاعة/i },
  { key: 'systems', label: 'Systems & Odoo', ar: 'الأنظمة وأودو', words: /odoo|system|whatsapp|excel|software|data|سيستم|نظام|اودو|أودو|واتس|اكسل|إكسل|بيانات/i },
  { key: 'people', label: 'Staffing & workload', ar: 'عدد الأفراد وضغط الشغل', words: /staff|people|team size|workload|pressure|overload|عدد|ناس|افراد|أفراد|ضغط|شغل كتير/i },
  { key: 'skills', label: 'Skills & training', ar: 'المهارات والتدريب', words: /skill|train|experien|knowledge|profession|expert|تدريب|خبرة|خبره|مهارة|فاهم|محترف|كفاءة/i },
  { key: 'attitude', label: 'Attitude & cooperation', ar: 'التعامل والتعاون', words: /attitude|respect|polite|friendly|help|cooperat|rude|support|team ?work|تعامل|احترام|محترم|ذوق|بيساعد|مساعدة|تعاون|متعاون|دعم/i },
  { key: 'quality', label: 'Quality & accuracy', ar: 'الجودة والدقة', words: /quality|accura|mistake|error|careful|clean|جودة|جوده|دقة|دقيق|غلط|اخطاء|أخطاء|متقن/i },
  { key: 'customers', label: 'Customers & hospitals', ar: 'العملاء والمستشفيات', words: /customer|client|hospital|doctor|patient|عميل|عملاء|مستشفى|مستشفيات|دكتور|دكاترة|مريض|مرضى/i },
  { key: 'planning', label: 'Planning & organisation', ar: 'التخطيط والتنظيم', words: /plan|organi|process|chaos|random|clear|تخطيط|تنظيم|منظم|عشوائ|خطة|واضح|إجراءات|اجراءات/i },
]

export function themesOf(text: string) {
  return THEMES.filter((t) => t.words.test(text)).map((t) => t.key)
}

export interface ThemeRow {
  key: string
  label: string
  ar: string
  count: number
  byDept: Record<string, number>
  examples: (Comment & { dept: string })[]
}

/** Counts praise or complaints per theme (and per department). */
export function themeCounts(depts: DeptResult[], kind: 'strengths' | 'weaknesses'): ThemeRow[] {
  const rows = THEMES.map((t) => ({ key: t.key, label: t.label, ar: t.ar, count: 0, byDept: {} as Record<string, number>, examples: [] as ThemeRow['examples'] }))
  for (const d of depts) {
    for (const c of d[kind]) {
      for (const key of themesOf(c.text)) {
        const r = rows.find((x) => x.key === key)!
        r.count++
        r.byDept[d.key] = (r.byDept[d.key] ?? 0) + 1
        if (r.examples.length < 4 && !r.examples.some((e) => normalize(e.text) === normalize(c.text) && e.dept === d.key)) r.examples.push({ ...c, dept: d.key })
      }
    }
  }
  return rows.filter((r) => r.count > 0).sort((a, b) => b.count - a.count)
}

export interface Highlight {
  label: string
  ar: string
  value: string
  detail: string
  tone: 'good' | 'bad'
}

/** The headline "best and worst" facts for the overview. */
export function highlights(subs: Submission[]): Highlight[] {
  const depts = departmentResults(subs).filter((d) => d.average !== null && d.n >= MIN_GROUP)
  const ranked = [...depts].sort((a, b) => b.average! - a.average!)
  const praise = themeCounts(departmentResults(subs), 'strengths')
  const complaints = themeCounts(departmentResults(subs), 'weaknesses')
  const c = companyResults(subs)
  const n = nominations(subs)
  const out: Highlight[] = []
  if (ranked[0]) out.push({ label: 'Best-rated department', ar: 'أعلى إدارة تقييماً', value: ranked[0].name, detail: `${ranked[0].average}/10 from ${ranked[0].n} colleagues`, tone: 'good' })
  if (ranked.length > 1) { const w = ranked[ranked.length - 1]; out.push({ label: 'Lowest-rated department', ar: 'أقل إدارة تقييماً', value: w.name, detail: `${w.average}/10 from ${w.n} colleagues`, tone: 'bad' }) }
  if (praise[0]) out.push({ label: 'Most praised', ar: 'أكتر حاجة اتشكر فيها', value: praise[0].label, detail: `${praise[0].count} mentions`, tone: 'good' })
  if (complaints[0]) out.push({ label: 'Biggest complaint', ar: 'أكبر شكوى', value: complaints[0].label, detail: `${complaints[0].count} mentions`, tone: 'bad' })
  if (c.strengths[0]) out.push({ label: 'Top company strength', ar: 'أهم ميزة للشركة', value: c.strengths[0].text, detail: `named by ${c.strengths[0].count}`, tone: 'good' })
  if (c.problems[0]) out.push({ label: 'Top company problem', ar: 'أكبر مشكلة', value: c.problems[0].text, detail: `named by ${c.problems[0].count}`, tone: 'bad' })
  if (n.managers[0]) out.push({ label: 'Most nominated manager', ar: 'أحسن مدير', value: n.managers[0].label, detail: `${n.managers[0].points} pts · ${n.managers[0].votes} votes`, tone: 'good' })
  if (n.employees[0]) out.push({ label: 'Most nominated employee', ar: 'أحسن موظف', value: n.employees[0].label, detail: `${n.employees[0].points} pts · ${n.employees[0].votes} votes`, tone: 'good' })
  return out
}

export interface Audit {
  total: number
  quality: { high: number; medium: number; low: number; unknown: number }
  flags: { straightLined: number; rushed: number; checksRaised: number; extreme: number }
  medianMinutes: number | null
  completeness: { label: string; pct: number }[]
  selfBias: { key: string; name: string; self: number; others: number; gap: number }[]
  ownDeptVotes: number // % of "best department" first places that went to the voter's own department
  skips: { key: string; name: string; skips: number; pct: number }[]
  flagged: { id: string; reasons: string[]; score: number | null }[]
  perDay: { day: string; count: number }[]
}

export function audit(subs: Submission[]): Audit {
  const total = subs.length
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0)
  const quality = { high: 0, medium: 0, low: 0, unknown: 0 }
  const flags = { straightLined: 0, rushed: 0, checksRaised: 0, extreme: 0 }
  const minutes: number[] = []
  const flagged: Audit['flagged'] = []
  let firstOwn = 0
  let firsts = 0
  const perDay = new Map<string, number>()
  for (const s of subs) {
    const a = ans(s)
    const q = s.quality ?? {}
    quality[(q.level as 'high' | 'medium' | 'low') ?? 'unknown']++
    if (q.straight_lined) flags.straightLined++
    if (q.rushed) flags.rushed++
    if (q.contradictions) flags.checksRaised++
    if (typeof q.minutes === 'number') minutes.push(q.minutes)
    const scores = Object.values(a.depts ?? {}).filter((r) => !r.skip && typeof r.score === 'number').map((r) => r.score!)
    const extreme = scores.length >= 5 && (scores.every((v) => v <= 2) || scores.every((v) => v >= 10))
    if (extreme) flags.extreme++
    const reasons = [
      q.level === 'low' ? 'low answer quality' : '',
      q.straight_lined ? 'same score for every department' : '',
      q.rushed ? `answered in ${q.minutes} min` : '',
      extreme ? 'all scores at the extreme' : '',
    ].filter(Boolean)
    if (reasons.length) flagged.push({ id: s.id, reasons, score: q.score ?? null })
    if (a.best_departments?.[0]) {
      firsts++
      if (a.best_departments[0] === a.my_dept) firstOwn++
    }
    const day = (s.submitted_at ?? s.updated_at ?? '').slice(0, 10)
    if (day) perDay.set(day, (perDay.get(day) ?? 0) + 1)
  }
  const has = (fn: (a: SurveyAnswers) => boolean) => pct(subs.filter((s) => fn(ans(s))).length)
  const completeness = [
    { label: 'Said their department', pct: has((a) => Boolean(a.my_dept)) },
    { label: 'Rated at least one department', pct: has((a) => Object.values(a.depts ?? {}).some((r) => typeof r.score === 'number')) },
    { label: 'Covered all 8 departments (rated or skipped)', pct: has((a) => SURVEY_DEPARTMENTS.every((d) => a.depts?.[d.key]?.skip || typeof a.depts?.[d.key]?.score === 'number')) },
    { label: 'Wrote at least one weakness', pct: has((a) => Object.values(a.depts ?? {}).some((r) => r.weaknesses?.trim())) },
    { label: 'Named a best manager', pct: has((a) => Boolean(a.best_managers?.some((n) => n.name?.trim()))) },
    { label: 'Named a best employee', pct: has((a) => Boolean(a.best_employees?.some((n) => n.name?.trim()))) },
    { label: 'Named a company problem', pct: has((a) => Boolean(a.company_problems?.some((t) => t?.trim()))) },
    { label: 'Shared at least one idea', pct: has((a) => Boolean(a.company_ideas?.some((t) => t?.trim()))) },
  ]
  const depts = departmentResults(subs)
  const selfBias = depts
    .filter((d) => d.selfAverage !== null && d.average !== null && d.selfN >= 1)
    .map((d) => ({ key: d.key, name: d.name, self: d.selfAverage!, others: d.average!, gap: Math.round((d.selfAverage! - d.average!) * 10) / 10 }))
    .sort((a, b) => b.gap - a.gap)
  const skips = depts.map((d) => ({ key: d.key, name: d.name, skips: d.skips, pct: pct(d.skips) })).sort((a, b) => b.skips - a.skips)
  const sorted = [...minutes].sort((a, b) => a - b)
  return {
    total,
    quality,
    flags,
    medianMinutes: sorted.length ? sorted[Math.floor(sorted.length / 2)] : null,
    completeness,
    selfBias,
    ownDeptVotes: firsts ? Math.round((firstOwn / firsts) * 100) : 0,
    skips,
    flagged: flagged.sort((a, b) => (a.score ?? 100) - (b.score ?? 100)),
    perDay: [...perDay].sort((a, b) => a[0].localeCompare(b[0])).map(([day, count]) => ({ day, count })),
  }
}
