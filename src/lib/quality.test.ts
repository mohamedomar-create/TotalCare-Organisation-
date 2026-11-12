import { describe, expect, it } from 'vitest'
import { assessQuality, findIssues, missingAnswers, normalize } from './quality'
import { SURVEY_DEPARTMENTS } from './survey'
import { allIdeas, companyResults, departmentResults, nominations } from './results'
import type { SurveyAnswers } from './survey'
import type { Submission } from './types'

const now = new Date('2026-11-06T10:00:00Z')
const ago = (m: number) => new Date(now.getTime() - m * 60000).toISOString()

describe('answer checks', () => {
  it('a careful answer has no issues', () => {
    const a: SurveyAnswers = {
      v: 2,
      my_dept: 'sales',
      started_at: ago(12),
      depts: { marketing: { score: 8, strengths: 'Good events', weaknesses: 'Late materials' }, sales: { score: 6 }, maintenance: { score: 9, strengths: 'Fast' } },
      best_departments: ['maintenance', 'marketing'],
      best_employees: [{ name: 'Mona Adel' }, { name: 'Karim Mostafa' }],
    }
    const q = assessQuality(a, 'Sara Ali', now)
    expect(q.issues).toEqual([])
    expect(q.score).toBe(100)
  })

  it('requires the department', () => {
    expect(findIssues({}).map((i) => [i.key, i.severity])).toEqual([['no_dept', 'hard']])
  })

  it('asks when a "best" department was rated low, and when text and score disagree', () => {
    const a: SurveyAnswers = {
      my_dept: 'marketing',
      depts: { accounting: { score: 3, strengths: 'Friendly' }, sales: { score: 10, weaknesses: 'Slow quotes' } },
      best_departments: ['accounting'],
    }
    expect(findIssues(a).map((i) => i.key).sort()).toEqual(['best_low_accounting', 'high_no_strength_sales', 'low_no_weak_accounting'])
  })

  it('blocks self-nomination and duplicates, whatever the spelling', () => {
    const a: SurveyAnswers = { my_dept: 'sales', best_employees: [{ name: 'م. أحمد حسن' }, { name: 'Mona' }, { name: 'mona ' }] }
    const issues = findIssues(a, 'احمد  حسن')
    expect(issues.filter((i) => i.severity === 'hard').map((i) => i.key)).toEqual(['self_best employee', 'dup_best employee'])
  })

  it('flags the same score everywhere and rushing; confirming lowers the penalty', () => {
    const same = Object.fromEntries(['marketing', 'installations', 'collections', 'accounting', 'sales', 'maintenance'].map((k) => [k, { score: 7 }]))
    const q = assessQuality({ my_dept: 'sales', depts: same, started_at: ago(1) }, '', now)
    expect(q.straightLined && q.rushed).toBe(true)
    expect(q.level).toBe('low')
    const a: SurveyAnswers = { my_dept: 'sales', depts: { hr_legal: { score: 2, strengths: 'Quick contracts' } }, started_at: ago(10) }
    expect(assessQuality(a, '', now).score).toBe(85)
    expect(assessQuality({ ...a, confirmed: ['low_no_weak_hr_legal'] }, '', now).score).toBe(95)
  })

  it('normalises Arabic spelling variants and titles', () => {
    expect(normalize('د. إسلام  مصطفى')).toBe(normalize('اسلام مصطفي'))
    expect(normalize('Eng. Hana')).toBe('hana')
  })
})

describe('every question is required', () => {
  const full = (): SurveyAnswers => ({
    v: 2,
    my_dept: 'sales',
    depts: Object.fromEntries(SURVEY_DEPARTMENTS.map((d) => [d.key, { score: 7, strengths: 'Helpful', weaknesses: 'Slow', ideas: 'Weekly meeting' }])),
    best_managers: [{ name: 'Ahmed' }, { name: 'Hala' }, { name: 'Tarek' }],
    best_departments: ['maintenance', 'sales', 'marketing'],
    best_employees: [{ name: 'Mona' }, { name: 'Karim' }, { name: 'Hana' }],
    company_problems: ['Late payments', 'Too many signatures', 'Customs delays'],
    company_strengths: ['Trusted by hospitals', 'Strong brands', 'Good engineers'],
    company_ideas: ['Odoo for all orders', 'Two signatures max', 'Monthly star award', 'Route planning', 'Training day'],
  })

  it('a complete survey has nothing missing', () => {
    expect(missingAnswers(full())).toEqual([])
  })

  it('names each gap and the step to go back to', () => {
    const a = full()
    a.depts!.accounting = { score: 4, strengths: 'Accurate', weaknesses: ' - ' }
    delete a.depts!.hr_legal
    a.best_departments = ['maintenance']
    a.best_employees = [{ name: 'Mona' }, { name: '' }, { name: 'Hana' }]
    a.company_ideas = ['One', 'Two', '', '', '']
    const m = missingAnswers(a)
    expect(m.map((i) => [i.key, i.step])).toEqual([
      ['missing_dept_accounting', 1],
      ['missing_dept_hr_legal', 1],
      ['missing_best_departments', 2],
      ['missing_best_employees', 2],
      ['missing_company_ideas', 4],
    ])
    expect(m[0].message).toBe('Accounting: answer the weaknesses, ideas.')
    expect(m.every((i) => i.severity === 'hard')).toBe(true)
  })

  it('a short answer in any language counts; dashes and dots do not', () => {
    const a = full()
    a.depts!.sales = { score: 5, strengths: 'i', weaknesses: 'ب', ideas: '3' }
    expect(missingAnswers(a)).toEqual([])
    a.depts!.sales = { score: 5, strengths: '-', weaknesses: ' . ', ideas: '…' }
    expect(missingAnswers(a)[0].message).toBe('Sales: answer the strengths, weaknesses, ideas.')
  })

  it('an old "I don\'t deal with them" no longer counts as an answer', () => {
    const a = full()
    a.depts!.purchasing = { skip: true }
    expect(missingAnswers(a).map((i) => i.key)).toEqual(['missing_dept_purchasing'])
  })
})

describe('results', () => {
  const sub = (id: string, answers: SurveyAnswers, anonymous = false) => ({ id, answers: { v: 2, ...answers }, anonymous, status: 'submitted' } as unknown as Submission)
  const subs = [
    sub('1', { my_dept: 'sales', depts: { sales: { score: 10 }, marketing: { score: 4, weaknesses: 'Late brochures', ideas: 'Plan events 3 months ahead' } }, best_employees: [{ name: 'Mona Adel' }, { name: 'Karim' }], best_departments: ['maintenance'], company_problems: ['Late payments & collections'], company_ideas: ['Odoo for all orders'] }),
    sub('2', { my_dept: 'maintenance', depts: { sales: { score: 6 }, marketing: { score: 8, strengths: 'Good events' }, accounting: { skip: true } }, best_employees: [{ name: 'karim' }, { name: 'mona adel' }], best_departments: ['maintenance', 'sales'], company_problems: ['late payments & collections '], reward_code: 'IDEA-ABC' }, true),
    sub('3', { my_dept: 'marketing', depts: { marketing: { score: 10 }, sales: { score: 9 } }, best_employees: [{ name: 'Mona Adel' }], company_problems: ['Customs & import delays'] }),
  ]

  it('excludes self-ratings from a department’s average and keeps them apart', () => {
    const r = departmentResults(subs)
    const sales = r.find((d) => d.key === 'sales')!
    expect(sales.average).toBe(7.5) // 6 and 9 from others; the 10 from Sales itself is separate
    expect(sales.selfAverage).toBeNull() // one self-rating would show one person's score
    expect(sales.selfN).toBe(1)
    expect(sales.nps).toBe(0) // one 9 (promoter), one 6 (detractor)
    const mk = r.find((d) => d.key === 'marketing')!
    expect(mk.average).toBe(6)
    expect(mk.weaknesses[0]).toMatchObject({ text: 'Late brochures', fromDept: 'Sales', self: false })
    expect(mk.strengths[0]).toMatchObject({ text: 'Good events', fromDept: 'anonymous colleague' })
    expect(r.find((d) => d.key === 'accounting')!.skips).toBe(1)
  })

  it('ranks nominations 3-2-1 and merges spellings', () => {
    const n = nominations(subs)
    expect(n.employees[0]).toMatchObject({ label: 'Mona Adel', points: 8, firsts: 2, votes: 3 })
    expect(n.employees[1]).toMatchObject({ points: 5 })
    expect(n.departments[0]).toMatchObject({ label: 'Maintenance', points: 6 })
  })

  it('groups the same problem written differently, and keeps idea reward codes', () => {
    const c = companyResults(subs)
    expect(c.problems[0]).toEqual({ text: 'Late payments & collections', count: 2 })
    const ideas = allIdeas(subs)
    expect(ideas.map((i) => i.source).sort()).toEqual(['Company', 'Marketing'])
    expect(allIdeas([subs[1]])).toEqual([])
  })
})

import { applySegment, audit, companyScore, crossMatrix, highlights, themeCounts, themesOf, topMentions } from './results'

describe('dashboard analytics', () => {
  const mk = (id: string, my: string, depts: Record<string, { score?: number; skip?: boolean; strengths?: string; weaknesses?: string }>, extra: Partial<Submission> = {}, more: SurveyAnswers = {}) =>
    ({ id, answers: { v: 2, my_dept: my, depts, ...more }, status: 'submitted', submitted_at: '2026-11-0' + (Number(id) % 9 + 1) + 'T10:00:00Z', quality: { level: 'high', score: 95, minutes: 9 }, ...extra } as unknown as Submission)
  const subs = [
    mk('1', 'sales', { sales: { score: 10 }, accounting: { score: 3, weaknesses: 'Payments are always late' }, maintenance: { score: 9, strengths: 'Fast response and very helpful' } }, {}, { best_departments: ['sales'] }),
    mk('2', 'sales', { accounting: { score: 4, weaknesses: 'تأخير في الدفع' }, maintenance: { score: 8, strengths: 'بيرد بسرعة' } }, {}, { best_departments: ['maintenance'] }),
    mk('3', 'sales', { accounting: { score: 2 }, maintenance: { score: 10 }, hr_legal: { skip: true } }, { quality: { level: 'low', score: 40, straight_lined: true, minutes: 1, rushed: true } }),
    mk('4', 'maintenance', { maintenance: { score: 10 }, accounting: { score: 6 } }, { anonymous: true }),
  ]

  it('scores the company without self-ratings', () => {
    const c = companyScore(subs)
    expect(c.n).toBe(7) // 3+2+2 from sales on others, 1 from maintenance on accounting
    expect(c.average).toBe(6)
    expect(c.index).toBe(56)
  })

  it('builds the who-rates-whom matrix and hides tiny groups', () => {
    const m = crossMatrix(subs)
    const sales = m.find((r) => r.from.key === 'sales')!
    expect(sales.n).toBe(3)
    const acc = sales.cells[3]
    expect(acc).toMatchObject({ average: 3, n: 3, hidden: false })
    const maintRow = m.find((r) => r.from.key === 'maintenance')!
    expect(maintRow.cells[3]).toMatchObject({ n: 1, hidden: true })
    expect(maintRow.cells[5].self).toBe(true)
  })

  it('sorts free text into themes in English and Arabic', () => {
    expect(themesOf('تأخير في الدفع')).toEqual(['speed', 'payments'])
    expect(themesOf('Fast response and very helpful')).toContain('attitude')
    const dr = departmentResults(subs)
    expect(themeCounts(dr, 'weaknesses')[0]).toMatchObject({ key: 'speed', count: 2 })
    expect(themeCounts(dr, 'strengths').find((t) => t.key === 'speed')!.count).toBe(2)
  })

  it('names the best and worst', () => {
    const h = highlights(subs)
    expect(h.find((x) => x.label === 'Best-rated department')!.value).toBe('Maintenance')
    expect(h.find((x) => x.label === 'Lowest-rated department')!.value).toBe('Accounting')
    expect(h.find((x) => x.label === 'Biggest complaint')!.value).toBe('Speed & delays')
  })

  it('audits quality, completeness, bias and own-department voting', () => {
    const a = audit(subs)
    expect(a.quality).toMatchObject({ high: 3, low: 1 })
    expect(a.flags).toMatchObject({ straightLined: 1, rushed: 1 })
    expect(a.flagged[0].id).toBe('3')
    expect(a.ownDeptVotes).toBe(50)
    expect(a.selfBias).toEqual([]) // only one person rated their own team: never shown
    expect(a.completeness.find((c) => c.label.startsWith('Rated'))!.pct).toBe(100)
    expect(a.skips[0]).toMatchObject({ key: 'hr_legal', skips: 1 })
  })

  it('counts the most-mentioned points across combined drop-down answers', () => {
    const top = topMentions([{ text: 'Fast response, Helpful and cooperative' }, { text: 'fast response' }, { text: 'Helpful and cooperative، Fast response' }, { text: 'Slow' }])
    expect(top).toEqual([{ text: 'Fast response', count: 3 }, { text: 'Helpful and cooperative', count: 2 }, { text: 'Slow', count: 1 }])
    expect(topMentions([{ text: 'A, a, A' }])).toEqual([{ text: 'A', count: 1 }]) // one person counts once
  })

  it('filters by segment', () => {
    expect(applySegment(subs, { dept: 'sales' }).length).toBe(3)
    expect(applySegment(subs, { mode: 'anonymous' }).map((s) => s.id)).toEqual(['4'])
  })
})
