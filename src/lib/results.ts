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
