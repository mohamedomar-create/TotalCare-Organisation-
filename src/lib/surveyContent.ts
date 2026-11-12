// Survey wording the super admin can change: question texts (English + Arabic), answer-choice lists
// and department names. Only changes are stored (table survey_content); everything else keeps the
// original wording below. The structure of the survey (steps, departments, how many answers) is fixed,
// so results stay comparable.
import {
  ARABIC, DEPT_IDEA_PICKS, DEPT_STRENGTH_PICKS, DEPT_WEAKNESS_PICKS, PROBLEM_SUGGESTIONS, STRENGTH_SUGGESTIONS, SURVEY_DEPARTMENTS,
} from './survey'

export interface Bilingual { en: string; ar: string }

/** Every editable question text. {dept} is replaced by the department's name. */
export const TEXT_DEFAULTS = {
  dept_title: { en: 'Which department are you in?', ar: 'إنت في أنهي إدارة؟' },
  dept_lead: { en: 'That’s the only thing we ask about you. It lets us leave out a team’s rating of itself.', ar: 'ده السؤال الوحيد عنك.' },
  rate_title: { en: 'Rate each department', ar: 'قيّم كل إدارة' },
  rate_lead: { en: 'For each of the 8 departments: your score from 1 to 10, its biggest strengths, its biggest weaknesses and one idea to improve it. All questions are required.', ar: 'كل الأسئلة إجبارية.' },
  q_score: { en: 'Your opinion of {dept}', ar: 'رأيك في {dept}' },
  q_strengths: { en: 'Biggest strengths', ar: 'أكبر مميزات {dept}' },
  q_weaknesses: { en: 'Biggest weaknesses', ar: 'أكبر عيوب {dept}' },
  q_ideas: { en: 'Ideas to improve it', ar: 'أفكار لتحسين {dept}' },
  best_title: { en: 'The best at TotalCare', ar: 'الأحسن في TotalCare' },
  best_lead: { en: 'Your top 3 in each — all three are required. Write each person’s full name. You can’t choose yourself, and each name only once.', ar: 'اكتب ٣ أسماء في كل سؤال.' },
  best_manager: { en: 'Best manager', ar: 'أحسن مدير' },
  best_department: { en: 'Best department', ar: 'أحسن إدارة' },
  best_employee: { en: 'Best employee', ar: 'أحسن موظف' },
  company_title: { en: 'The company', ar: 'الشركة' },
  company_lead: { en: 'Three of each, all required. Choose from the list, or “Other” to write your own.', ar: 'اختار ٣ في كل سؤال.' },
  company_problems: { en: 'Biggest company problems', ar: 'أكبر مشاكل الشركة' },
  company_strengths: { en: 'Best company strengths', ar: 'أحسن مميزات الشركة' },
  ideas_title: { en: 'Ideas to develop TotalCare', ar: 'أفكار ممكن تطوّر الشركة' },
  ideas_lead: { en: 'Write 5 ideas — all five are required.', ar: 'اكتب ٥ أفكار.' },
  reward: { en: 'The best idea will be rewarded — and implemented if possible.', ar: 'أحسن فكرة هيتم مكافأتها وتنفيذها في حالة الاستطاعة.' },
  send_question: { en: 'How do you want to send it?', ar: 'عايز تبعتها إزاي؟' },
} satisfies Record<string, Bilingual>

export type TextKey = keyof typeof TEXT_DEFAULTS

/** Where each text appears, for the editor. */
export const TEXT_GROUPS: { title: string; keys: TextKey[] }[] = [
  { title: 'Step 1 · Your department', keys: ['dept_title', 'dept_lead'] },
  { title: 'Step 2 · Departments (asked for each department)', keys: ['rate_title', 'rate_lead', 'q_score', 'q_strengths', 'q_weaknesses', 'q_ideas'] },
  { title: 'Step 3 · The best', keys: ['best_title', 'best_lead', 'best_manager', 'best_department', 'best_employee'] },
  { title: 'Step 4 · The company', keys: ['company_title', 'company_lead', 'company_problems', 'company_strengths'] },
  { title: 'Step 5 · Ideas', keys: ['ideas_title', 'ideas_lead', 'reward'] },
  { title: 'Step 6 · Check and send', keys: ['send_question'] },
]

type Pair = [string, string]
/** The answer-choice lists. They are the same arrays the survey and results use, changed in place. */
export const LISTS: Record<string, { title: string; list: Pair[]; min: number; picks?: boolean }> = {
  dept_strengths: { picks: true, title: 'Department strengths — “Choose a common answer”', list: DEPT_STRENGTH_PICKS, min: 3 },
  dept_weaknesses: { picks: true, title: 'Department weaknesses — “Choose a common answer”', list: DEPT_WEAKNESS_PICKS, min: 3 },
  dept_ideas: { picks: true, title: 'Department ideas — “Choose a common answer”', list: DEPT_IDEA_PICKS, min: 3 },
  company_problems: { title: 'Biggest company problems', list: PROBLEM_SUGGESTIONS, min: 5 },
  company_strengths: { title: 'Best company strengths', list: STRENGTH_SUGGESTIONS, min: 5 },
}
export type ListKey = keyof typeof LISTS

export interface SurveyContent {
  texts?: Partial<Record<TextKey, Bilingual>>
  lists?: Partial<Record<ListKey, Pair[]>>
  departments?: Record<string, { name?: string; ar?: string }>
}

// Originals, kept to fill gaps and to reset.
export const LIST_DEFAULTS = Object.fromEntries(Object.entries(LISTS).map(([k, v]) => [k, v.list.map((p) => [...p] as Pair)])) as Record<ListKey, Pair[]>
export const DEPT_DEFAULTS = Object.fromEntries(SURVEY_DEPARTMENTS.map((d) => [d.key, { name: d.name, ar: d.ar }]))

const texts: Record<TextKey, Bilingual> = { ...TEXT_DEFAULTS }
let current: SurveyContent = {}

/** The text to show, with {dept} filled in. */
export function tx(key: TextKey, dept?: string): Bilingual {
  const t = texts[key]
  const fill = (s: string, d?: string) => (d ? s.replaceAll('{dept}', d) : s.replaceAll(' {dept}', '').replaceAll('{dept}', ''))
  return { en: fill(t.en, dept), ar: fill(t.ar, dept) }
}

export const currentContent = () => current

/** Apply saved changes over the originals (also used after the admin saves). */
export function applySurveyContent(content: SurveyContent | null | undefined) {
  current = content ?? {}
  for (const k of Object.keys(TEXT_DEFAULTS) as TextKey[]) {
    const o = current.texts?.[k]
    texts[k] = { en: o?.en?.trim() || TEXT_DEFAULTS[k].en, ar: o?.ar?.trim() || TEXT_DEFAULTS[k].ar }
  }
  for (const k of Object.keys(LISTS) as ListKey[]) {
    const next = current.lists?.[k]?.length ? current.lists[k]! : LIST_DEFAULTS[k]
    LISTS[k].list.splice(0, LISTS[k].list.length, ...next.map((p) => [...p] as Pair))
    for (const [en, ar] of next) if (en && ar) ARABIC[en] = ar
  }
  for (const d of SURVEY_DEPARTMENTS) {
    const o = current.departments?.[d.key]
    d.name = o?.name?.trim() || DEPT_DEFAULTS[d.key].name
    d.ar = o?.ar?.trim() || DEPT_DEFAULTS[d.key].ar
  }
}

/** "English | Arabic" lines ⇄ pairs, for the editor. */
export const listToText = (list: Pair[]) => list.map(([en, ar]) => (ar ? `${en} | ${ar}` : en)).join('\n')
export function textToList(text: string, noCommas = false): { list: Pair[]; error?: string } {
  const list: Pair[] = []
  const seen = new Set<string>()
  for (const line of text.split('\n')) {
    const [en = '', ar = ''] = line.split('|').map((x) => x.trim())
    if (!en) continue
    if (noCommas && en.includes(',')) return { list, error: `“${en}”: please don’t use commas — they separate answers.` }
    const k = en.toLowerCase()
    if (seen.has(k)) return { list, error: `“${en}” is listed twice.` }
    seen.add(k)
    list.push([en, ar])
  }
  if (list.length > 30) return { list, error: 'Keep it to 30 choices or fewer.' }
  return { list }
}
