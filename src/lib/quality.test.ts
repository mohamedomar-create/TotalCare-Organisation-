import { describe, expect, it } from 'vitest'
import { assessQuality, findIssues, normalize } from './quality'
import { allIdeas, companyResults, departmentResults, nominations } from './results'
import type { SurveyAnswers } from './survey'
import type { Submission } from './types'

const now = new Date('2026-11-06T10:00:00Z')
const ago = (m: number) => new Date(now.getTime() - m * 60000).toISOString()

describe('answer checks', () => {
  it('a careful answer has no issues', () => {
    const a: SurveyAnswers = {
      v: 2,
      started_at: ago(12),
      depts: { marketing: { score: 8, strengths: 'Good events', weaknesses: 'Late materials' }, sales: { score: 6 }, maintenance: { score: 9, strengths: 'Fast' } },
      best_departments: ['maintenance', 'marketing'],
      best_employees: [{ name: 'Mona Adel' }, { name: 'Karim Mostafa' }],
    }
    const q = assessQuality(a, 'Sara Ali', now)
    expect(q.issues).toEqual([])
    expect(q.score).toBe(100)
  })

  it('asks when a "best" department was rated low, and when text and score disagree', () => {
    const a: SurveyAnswers = {
      depts: { accounting: { score: 3, strengths: 'Friendly' }, sales: { score: 10, weaknesses: 'Slow quotes' } },
      best_departments: ['accounting'],
    }
    expect(findIssues(a).map((i) => i.key).sort()).toEqual(['best_low_accounting', 'high_no_strength_sales', 'low_no_weak_accounting'])
  })

  it('blocks self-nomination and duplicates, whatever the spelling', () => {
    const a: SurveyAnswers = { best_employees: [{ name: 'م. أحمد حسن' }, { name: 'Mona' }, { name: 'mona ' }] }
    const issues = findIssues(a, 'احمد  حسن')
    expect(issues.filter((i) => i.severity === 'hard').map((i) => i.key)).toEqual(['self_best employee', 'dup_best employee'])
  })

  it('flags the same score everywhere and rushing; confirming lowers the penalty', () => {
    const same = Object.fromEntries(['marketing', 'installations', 'collections', 'accounting', 'sales', 'maintenance'].map((k) => [k, { score: 7 }]))
    const q = assessQuality({ depts: same, started_at: ago(1) }, '', now)
    expect(q.straightLined && q.rushed).toBe(true)
    expect(q.level).toBe('low')
    const a: SurveyAnswers = { depts: { hr_legal: { score: 2, strengths: 'Quick contracts' } }, started_at: ago(10) }
    expect(assessQuality(a, '', now).score).toBe(85)
    expect(assessQuality({ ...a, confirmed: ['low_no_weak_hr_legal'] }, '', now).score).toBe(95)
  })

  it('normalises Arabic spelling variants and titles', () => {
    expect(normalize('د. إسلام  مصطفى')).toBe(normalize('اسلام مصطفي'))
    expect(normalize('Eng. Hana')).toBe('hana')
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
    expect(sales.selfAverage).toBe(10)
    expect(sales.nps).toBe(0) // one 9 (promoter), one 6 (detractor)
    const mk = r.find((d) => d.key === 'marketing')!
    expect(mk.average).toBe(6)
    expect(mk.weaknesses[0]).toMatchObject({ text: 'Late brochures', fromDept: 'Sales', self: false })
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
