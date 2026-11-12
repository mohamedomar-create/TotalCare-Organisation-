import { afterEach, describe, expect, it } from 'vitest'
import { ARABIC, PROBLEM_SUGGESTIONS, SURVEY_DEPARTMENTS, deptByKey } from './survey'
import { applySurveyContent, listToText, textToList, tx } from './surveyContent'

afterEach(() => applySurveyContent({}))

describe('editable survey wording', () => {
  it('uses the original wording until something is changed', () => {
    applySurveyContent(null)
    expect(tx('rate_title')).toEqual({ en: 'Rate each department', ar: 'قيّم كل إدارة' })
    expect(tx('q_score', 'Sales').en).toBe('Your opinion of Sales')
  })

  it('applies changed questions, choices and department names everywhere, and resets them', () => {
    const before = PROBLEM_SUGGESTIONS.length
    applySurveyContent({
      texts: { q_score: { en: 'How happy are you with {dept}?', ar: 'إنت راضي عن {dept}؟' } },
      lists: { company_problems: [['Slow approvals', 'موافقات بطيئة'], ['Late salaries', 'تأخير المرتبات'], ['No training', 'مفيش تدريب'], ['Old cars', 'عربيات قديمة'], ['Traffic', 'زحمة']] },
      departments: { sales: { name: 'Sales & Tenders', ar: 'المبيعات والمناقصات' } },
    })
    expect(tx('q_score', 'Sales').en).toBe('How happy are you with Sales?')
    expect(PROBLEM_SUGGESTIONS.map(([en]) => en)).toEqual(['Slow approvals', 'Late salaries', 'No training', 'Old cars', 'Traffic'])
    expect(ARABIC['Old cars']).toBe('عربيات قديمة')
    expect(deptByKey('sales')!.name).toBe('Sales & Tenders')
    applySurveyContent({})
    expect(PROBLEM_SUGGESTIONS.length).toBe(before)
    expect(SURVEY_DEPARTMENTS.find((d) => d.key === 'sales')!.name).toBe('Sales')
    expect(tx('q_score', 'Sales').en).toBe('Your opinion of Sales')
  })

  it('reads the editor’s “English | Arabic” lines and refuses mistakes', () => {
    expect(textToList('Fast | سريع\n\n  Kind |  لطيف ').list).toEqual([['Fast', 'سريع'], ['Kind', 'لطيف']])
    expect(textToList('Fast\nfast').error).toMatch(/twice/)
    expect(textToList('Fast, kind', true).error).toMatch(/commas/)
    expect(textToList('Missing tools (car, laptop)').error).toBeUndefined() // commas are fine where choices aren't combined
    expect(listToText([['A', 'أ'], ['B', '']])).toBe('A | أ\nB')
  })
})
