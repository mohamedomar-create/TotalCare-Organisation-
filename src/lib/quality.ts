// Answer consistency: finds answers that don't fit together, so the person can fix them before
// sending, and gives every response a quality score the results page can filter on.
import { SURVEY_DEPARTMENTS, deptByKey, type DeptReview, type SurveyAnswers } from './survey'

export interface Issue {
  key: string
  /** hard issues must be fixed before sending; soft ones can be confirmed */
  severity: 'hard' | 'soft'
  message: string
  ar: string
  /** the step to go back to */
  step: number
  dept?: string
}

export interface Quality {
  score: number // 0–100
  level: 'high' | 'medium' | 'low'
  issues: Issue[]
  open: Issue[]
  confirmed: number
  straightLined: boolean
  rushed: boolean
  minutes: number | null
}

/** Makes names and short answers comparable: case, spaces, Arabic letter variants and diacritics. */
export function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[ً-ْـ]/g, '') // Arabic diacritics and tatweel
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/^(م|د|أ|ا|eng|dr|mr|mrs|ms)\.?\s+/i, '') // titles: م. / د. / Eng. / Dr.
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

const filled = (s?: string) => Boolean(s && s.trim())

export function findIssues(a: SurveyAnswers, myName = ''): Issue[] {
  const out: Issue[] = []
  const depts = a.depts ?? {}
  if (!a.my_dept) out.push({ key: 'no_dept', severity: 'hard', step: 0, message: 'Choose your department.', ar: 'اختار إدارتك.' })

  for (const key of a.best_departments ?? []) {
    const score = depts[key]?.score
    const d = deptByKey(key)
    if (d && typeof score === 'number' && score <= 4) {
      out.push({ key: `best_low_${key}`, severity: 'soft', step: 2, dept: key, message: `You picked ${d.name} as one of the best departments, but rated it ${score}/10.`, ar: `اخترت ${d.ar} من أحسن الإدارات، بس قيّمتها ${score}/١٠.` })
    }
  }

  for (const [key, r] of Object.entries(depts)) {
    const d = deptByKey(key)
    if (!d || r.skip || typeof r.score !== 'number') continue
    if (r.score <= 3 && filled(r.strengths) && !filled(r.weaknesses)) {
      out.push({ key: `low_no_weak_${key}`, severity: 'soft', step: 1, dept: key, message: `${d.name}: rated ${r.score}/10 but you wrote only strengths. What is the biggest weakness?`, ar: `${d.ar}: قيّمتها ${r.score}/١٠ وكتبت مميزات بس. إيه أكبر عيب؟` })
    }
    if (r.score >= 9 && filled(r.weaknesses) && !filled(r.strengths)) {
      out.push({ key: `high_no_strength_${key}`, severity: 'soft', step: 1, dept: key, message: `${d.name}: rated ${r.score}/10 but you wrote only weaknesses. What is it best at?`, ar: `${d.ar}: قيّمتها ${r.score}/١٠ وكتبت عيوب بس. إيه أحسن حاجة فيها؟` })
    }
  }

  const me = normalize(myName)
  for (const [list, label, ar] of [[a.best_managers, 'best manager', 'أحسن مدير'], [a.best_employees, 'best employee', 'أحسن موظف']] as const) {
    const names = (list ?? []).map((n) => normalize(n.name)).filter(Boolean)
    if (me && names.includes(me)) out.push({ key: `self_${label}`, severity: 'hard', step: 2, message: `You can’t nominate yourself as ${label}.`, ar: `مينفعش ترشّح نفسك ${ar}.` })
    if (new Set(names).size !== names.length) out.push({ key: `dup_${label}`, severity: 'hard', step: 2, message: `The same person appears twice in “${label}”. Pick three different people.`, ar: `نفس الشخص متكرر في “${ar}”. اختار ٣ أشخاص مختلفين.` })
  }
  return out
}

export function assessQuality(a: SurveyAnswers, myName = '', now = new Date()): Quality {
  const issues = findIssues(a, myName)
  const open = issues.filter((i) => !a.confirmed?.includes(i.key))
  const confirmed = issues.length - open.length

  // Same score for every department (6+ departments): possible, but usually means not reading.
  const scores = Object.values(a.depts ?? {}).filter((r) => !r.skip && typeof r.score === 'number').map((r) => r.score!)
  const straightLined = scores.length >= 6 && scores.every((v) => v === scores[0])

  // Whole survey in under 3 minutes with 5+ departments scored.
  const minutes = a.started_at ? (now.getTime() - new Date(a.started_at).getTime()) / 60000 : null
  const rushed = minutes !== null && minutes < 3 && scores.length >= 5

  const softOpen = open.filter((i) => i.severity === 'soft').length
  const hardOpen = open.filter((i) => i.severity === 'hard').length
  const score = Math.max(0, Math.min(100, Math.round(100 - softOpen * 15 - hardOpen * 30 - confirmed * 5 - (straightLined ? 35 : 0) - (rushed ? 25 : 0))))
  return {
    score,
    level: score >= 75 ? 'high' : score >= 50 ? 'medium' : 'low',
    issues,
    open,
    confirmed,
    straightLined,
    rushed,
    minutes: minutes === null ? null : Math.round(minutes * 10) / 10,
  }
}

/** An answer counts once it has a letter or a number in it (so "-" or "." doesn't), in any language. */
export const answered = (s?: string) => /[\p{L}\p{N}]/u.test(s ?? '')

/** Which of the four questions about one department are still empty. */
export function deptGaps(r?: DeptReview) {
  const gaps: { en: string; ar: string }[] = []
  if (typeof r?.score !== 'number') gaps.push({ en: 'score', ar: 'التقييم' })
  if (!answered(r?.strengths)) gaps.push({ en: 'strengths', ar: 'المميزات' })
  if (!answered(r?.weaknesses)) gaps.push({ en: 'weaknesses', ar: 'العيوب' })
  if (!answered(r?.ideas)) gaps.push({ en: 'ideas', ar: 'الأفكار' })
  return gaps
}

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩'
const arNum = (n: number) => String(n).replace(/\d/g, (d) => AR_DIGITS[Number(d)])

/** Every question is required: one hard issue per incomplete question, pointing at its step. */
export function missingAnswers(a: SurveyAnswers): Issue[] {
  const out: Issue[] = []
  if (!a.my_dept) out.push({ key: 'no_dept', severity: 'hard', step: 0, message: 'Choose your department.', ar: 'اختار إدارتك.' })
  for (const d of SURVEY_DEPARTMENTS) {
    const gaps = deptGaps(a.depts?.[d.key])
    if (gaps.length) out.push({ key: `missing_dept_${d.key}`, severity: 'hard', step: 1, dept: d.key, message: `${d.name}: answer the ${gaps.map((g) => g.en).join(', ')}.`, ar: `${d.ar}: ناقص ${gaps.map((g) => g.ar).join('، ')}.` })
  }
  const need = (key: string, step: number, have: number, want: number, en: string, ar: string) => {
    if (have < want) out.push({ key, severity: 'hard', step, message: `${en}: fill in all ${want} (you have ${have}).`, ar: `${ar}: لازم ${arNum(want)} (عندك ${arNum(have)}).` })
  }
  const names = (xs?: { name: string }[]) => (xs ?? []).slice(0, 3).filter((n) => answered(n?.name)).length
  const texts = (xs: string[] | undefined, n: number) => (xs ?? []).slice(0, n).filter((t) => answered(t)).length
  need('missing_best_managers', 2, names(a.best_managers), 3, 'Best manager', 'أحسن مدير')
  need('missing_best_departments', 2, (a.best_departments ?? []).length, 3, 'Best department', 'أحسن إدارة')
  need('missing_best_employees', 2, names(a.best_employees), 3, 'Best employee', 'أحسن موظف')
  need('missing_company_problems', 3, texts(a.company_problems, 3), 3, 'Biggest company problems', 'أكبر مشاكل الشركة')
  need('missing_company_strengths', 3, texts(a.company_strengths, 3), 3, 'Best company strengths', 'أحسن مميزات الشركة')
  need('missing_company_ideas', 4, texts(a.company_ideas, 5), 5, 'Ideas to develop TotalCare', 'أفكار لتطوير الشركة')
  return out
}

/** What to store in submissions.quality. */
export function qualityRecord(q: Quality) {
  return { score: q.score, level: q.level, contradictions: q.issues.length, confirmed: q.confirmed, straight_lined: q.straightLined, rushed: q.rushed, minutes: q.minutes }
}

/** A short code an anonymous author keeps to claim the best-idea reward. */
export function newRewardCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  return 'IDEA-' + [...bytes].map((b) => alphabet[b % alphabet.length]).join('')
}
