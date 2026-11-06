import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

export type InitiativeStatus = 'proposed' | 'approved' | 'in_progress' | 'done' | 'parked'

export interface Initiative {
  id: string
  title: string
  description: string
  theme: string
  owner_name: string
  department_id: string | null
  status: InitiativeStatus
  impact: number
  effort: number
  kpi: string
  baseline: string
  target: string
  start_date: string | null
  due_date: string | null
  progress: number
  visible: boolean
  source: string
  rewarded: boolean
  reward_code: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface InitiativeUpdate {
  id: string
  initiative_id: string
  author_id: string | null
  body: string
  progress: number | null
  created_at: string
}

export const STATUS: Record<InitiativeStatus, { label: string; ar: string; tone: string }> = {
  proposed: { label: 'Proposed', ar: 'مقترحة', tone: 'slate' },
  approved: { label: 'Approved', ar: 'تمت الموافقة', tone: 'blue' },
  in_progress: { label: 'In progress', ar: 'جاري التنفيذ', tone: 'amber' },
  done: { label: 'Done', ar: 'اتنفذت', tone: 'green' },
  parked: { label: 'Parked', ar: 'مؤجلة', tone: 'rose' },
}

export function useInitiatives(userId: string | undefined) {
  const [items, setItems] = useState<Initiative[]>([])
  const [counts, setCounts] = useState<Map<string, { supporters: number; volunteers: number }>>(new Map())
  const [mine, setMine] = useState<Set<string>>(new Set()) // "<id>:support" | "<id>:volunteer"
  const [updates, setUpdates] = useState<InitiativeUpdate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const [i, c, s, u] = await Promise.all([
      supabase.from('initiatives').select('*').order('updated_at', { ascending: false }),
      supabase.rpc('initiative_counts'),
      userId ? supabase.from('initiative_supporters').select('initiative_id, kind').eq('user_id', userId) : Promise.resolve({ data: [] }),
      supabase.from('initiative_updates').select('*').order('created_at', { ascending: false }).limit(200),
    ])
    setError(i.error?.message ?? null)
    setItems((i.data ?? []) as Initiative[])
    setCounts(new Map(((c.data ?? []) as { initiative_id: string; supporters: number; volunteers: number }[]).map((r) => [r.initiative_id, r])))
    setMine(new Set(((s.data ?? []) as { initiative_id: string; kind: string }[]).map((r) => `${r.initiative_id}:${r.kind}`)))
    setUpdates((u.data ?? []) as InitiativeUpdate[])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    void reload()
  }, [reload])

  async function toggle(id: string, kind: 'support' | 'volunteer') {
    const key = `${id}:${kind}`
    const { error } = mine.has(key)
      ? await supabase.from('initiative_supporters').delete().eq('initiative_id', id).eq('kind', kind).eq('user_id', userId!)
      : await supabase.from('initiative_supporters').insert({ initiative_id: id, kind })
    if (error) setError(error.message)
    await reload()
  }

  return { items, counts, mine, updates, loading, error, reload, toggle }
}

export interface Template {
  title: string
  ar: string
  description: string
  kpi: string
  baseline: string
  target: string
  impact: number
  effort: number
}

/**
 * Ready-made initiatives for TotalCare, keyed by survey theme or problem. The results page suggests
 * these for the weakest themes and the most-picked problems; management edits them before approving.
 */
export const PLAYBOOK: Record<string, Template[]> = {
  clarity: [{ title: 'One-page job card for every role', ar: 'كارت وظيفي من صفحة لكل وظيفة', description: 'Each manager writes, with each person, a one-page card: main tasks, decisions they own, who they hand over to. Starts with sales reps, engineers and the warehouse.', kpi: '"I know what is expected" score', baseline: 'current survey score', target: '4.0 or higher next survey', impact: 4, effort: 2 }],
  manager: [{ title: 'Monthly 1:1 between every manager and each team member', ar: 'اجتماع فردي شهري بين كل مدير وكل فرد في فريقه', description: '20 minutes a month: what went well, what is blocked, one thing to learn. A simple checklist in Odoo or a shared sheet.', kpi: '% of people with a 1:1 in the last 30 days', baseline: 'unknown', target: '90%', impact: 4, effort: 2 }],
  recognition: [{ title: 'Monthly “TotalCare Star” per department', ar: 'نجم TotalCare الشهري في كل إدارة', description: 'Each department names one colleague a month, with the reason shared at the monthly meeting and a small reward (voucher or day off).', kpi: 'Recognition score', baseline: 'current survey score', target: '+0.5 next survey', impact: 3, effort: 1 }],
  pay: [{ title: 'Transparent salary review and incentive scheme', ar: 'مراجعة شفافة للمرتبات ونظام حوافز واضح', description: 'Benchmark key roles against the Egyptian market twice a year (inflation), publish salary bands per level, and a written incentive formula for sales, collections and service.', kpi: 'Fair pay score; voluntary turnover', baseline: 'current', target: 'Pay score ≥ 3.5; turnover down', impact: 5, effort: 4 }],
  workload: [{ title: 'Field route planning to cut Cairo traffic time', ar: 'تخطيط خطوط السير لتقليل وقت المرور', description: 'Plan visits by area and day (e.g. New Cairo Sunday, Giza Monday), combine deliveries and service visits, and track time on the road.', kpi: 'Hours on the road per visit', baseline: 'measure for 2 weeks', target: '-25%', impact: 4, effort: 2 }],
  growth: [{ title: 'Career ladders for engineers, reps and specialists', ar: 'مسار وظيفي واضح للمهندسين والمندوبين والأخصائيين', description: 'Define 3–4 levels per job family with the skills and results needed to move up, reviewed once a year.', kpi: 'Growth score; internal promotions', baseline: 'current', target: 'Growth ≥ 3.8', impact: 4, effort: 3 }],
  speakup: [{ title: 'Speak-up promise from management', ar: 'وعد من الإدارة: محدش هيتأذي علشان اتكلم', description: 'Management states publicly that nobody is punished for raising a problem, answers every Speak-up message within 5 working days, and shares themes (not names) each quarter.', kpi: 'Speak-up replies within 5 days', baseline: '—', target: '100%', impact: 4, effort: 1 }],
  pride: [{ title: 'Share patient and hospital success stories', ar: 'نشر قصص نجاح مع المرضى والمستشفيات', description: 'A short story every month about a device installed, a patient helped at home or a tender won, shared on the staff WhatsApp group and at meetings.', kpi: 'Pride score', baseline: 'current', target: '+0.3', impact: 3, effort: 1 }],
  communication: [{ title: 'Weekly 15-minute department huddle + monthly company update', ar: 'اجتماع أسبوعي ١٥ دقيقة لكل إدارة وتحديث شهري للشركة كلها', description: 'Same agenda every week: priorities, blockers, stock and tender news. One monthly update from the MD, also sent as a voice note for field staff.', kpi: 'Information score', baseline: 'current', target: '≥ 3.8', impact: 4, effort: 1 }],
  decisions: [{ title: 'Delegation of authority: max 2 signatures', ar: 'مصفوفة صلاحيات: توقيعين بحد أقصى', description: 'Write who can approve what, up to which EGP amount (discounts, quotations, purchases, credit). Anything under the limit needs at most 2 signatures, approved in Odoo.', kpi: 'Days from request to approval', baseline: 'measure current average', target: '≤ 2 working days', impact: 5, effort: 2 }],
  tools: [{ title: 'Tools audit: car, laptop, phone, demo units', ar: 'جرد الأدوات: عربية، لابتوب، موبايل، أجهزة ديمو', description: 'List what each role needs, what is missing or broken, and fix the top 10 gaps this quarter. Shared demo-device calendar for sales and applications.', kpi: 'Tools score; open tool requests', baseline: 'current', target: '≥ 3.8; 0 open over 30 days', impact: 4, effort: 3 }],
  systems: [{ title: 'Odoo first: move orders off WhatsApp', ar: 'Odoo أولاً: نقل الطلبات من الواتساب', description: 'Every quotation, order, service request and collection follow-up is created in Odoo. Short training per team, a champion per department, and a weekly report of what was done outside Odoo.', kpi: '% of orders created in Odoo', baseline: 'estimate', target: '95%', impact: 5, effort: 3 }],
  collaboration: [{ title: 'Order-to-cash handover map (Sales → Supply → Service → Finance)', ar: 'خريطة تسليم من البيع للتحصيل', description: 'One workshop per handover to agree who does what, by when, and in which system. Ends double work between Sales and Finance on the same invoice.', kpi: 'Teamwork score; days from delivery to invoice', baseline: 'current', target: 'Invoice within 2 days of delivery', impact: 4, effort: 2 }],
  customer: [{ title: 'Delivery & service promise tracker', ar: 'متابعة مواعيد التسليم والصيانة', description: 'Track promised vs actual dates for deliveries, installations and repairs in Odoo; review late ones weekly.', kpi: 'On-time delivery %', baseline: 'measure', target: '90%', impact: 5, effort: 3 }],
  compliance: [{ title: 'Compliance refresher: EDA, tenders and gifts policy', ar: 'تدريب الالتزام: هيئة الدواء والمناقصات والهدايا', description: 'A one-hour session per team on EDA registration rules, tender conduct and the gifts/hospitality policy, with a clear way to report concerns.', kpi: 'Doing-it-right score; % trained', baseline: 'current', target: '100% trained', impact: 4, effort: 1 }],
  training: [{ title: 'Product & systems training calendar', ar: 'خطة تدريب على المنتجات والأنظمة', description: 'A monthly calendar: new products from suppliers, Odoo skills, customer handling. New joiners get a 2-week onboarding plan.', kpi: 'Training hours per person', baseline: 'current', target: '4 hours a month', impact: 4, effort: 2 }],
  'Late payments & collections': [{ title: 'Weekly collections war-room', ar: 'اجتماع أسبوعي للتحصيل', description: 'Finance, Sales and the account owner review every overdue invoice over 60 days, with one owner and next step each. Escalate government and university payments early.', kpi: 'Receivables over 90 days', baseline: 'current EGP amount', target: '-30% in 6 months', impact: 5, effort: 2 }],
  'Government tenders pay late': [{ title: 'Tender cash-flow plan', ar: 'خطة السيولة للمناقصات', description: 'Before bidding, estimate payment time and financing cost for each tender; follow up payment documents from delivery day.', kpi: 'Average days to get paid on tenders', baseline: 'current', target: '-20%', impact: 4, effort: 2 }],
  'Customs & import delays': [{ title: '90-day import planning calendar', ar: 'خطة استيراد لـ ٩٠ يوم', description: 'Forecast stock needs 90 days ahead, plan shipments around customs and holidays, and track each shipment from order to warehouse.', kpi: 'Stock-outs on key items', baseline: 'current', target: '-50%', impact: 4, effort: 3 }],
  'Dollar / price changes hit our quotes': [{ title: 'Quotation validity and price-change rule', ar: 'قاعدة صلاحية عروض الأسعار وتغيير الأسعار', description: 'Short validity for quotes in volatile periods, a clear rule for price updates linked to the exchange rate, and one approver for exceptions.', kpi: 'Margin lost to price changes', baseline: 'estimate', target: 'Halve it', impact: 4, effort: 1 }],
  'EDA registration delays': [{ title: 'EDA registration tracker', ar: 'متابعة تسجيلات هيئة الدواء', description: 'Every product registration and renewal with its deadline, documents and owner, reviewed every two weeks, with alerts 6 months before expiry.', kpi: 'Registrations expired or late', baseline: 'current', target: '0', impact: 4, effort: 1 }],
  'Too many signatures / approvals': [{ title: 'Delegation of authority: max 2 signatures', ar: 'مصفوفة صلاحيات: توقيعين بحد أقصى', description: 'Write who can approve what and up to which EGP amount, then approve in Odoo instead of on paper.', kpi: 'Days from request to approval', baseline: 'measure', target: '≤ 2 working days', impact: 5, effort: 2 }],
  'Work runs on WhatsApp, not a system': [{ title: 'Odoo first: move orders off WhatsApp', ar: 'Odoo أولاً: نقل الطلبات من الواتساب', description: 'Create every order and request in Odoo; WhatsApp only to notify. One champion per department.', kpi: '% of orders created in Odoo', baseline: 'estimate', target: '95%', impact: 5, effort: 3 }],
  'Stock or spare parts not available on time': [{ title: 'Minimum stock levels for fast-moving items and spare parts', ar: 'حد أدنى للمخزون للأصناف السريعة وقطع الغيار', description: 'Set reorder points in Odoo for the top 50 items and spare parts, with a weekly stock alert to supply chain.', kpi: 'Service visits delayed by missing parts', baseline: 'current', target: '-60%', impact: 4, effort: 2 }],
  'Salary not keeping up with prices': [{ title: 'Transparent salary review and incentive scheme', ar: 'مراجعة شفافة للمرتبات ونظام حوافز واضح', description: 'Benchmark against the Egyptian market twice a year and publish salary bands per level.', kpi: 'Fair pay score; turnover', baseline: 'current', target: 'Pay score ≥ 3.5', impact: 5, effort: 4 }],
  'No clear career path': [{ title: 'Career ladders for engineers, reps and specialists', ar: 'مسار وظيفي واضح', description: 'Define levels per job family with the skills needed to move up.', kpi: 'Internal promotions', baseline: 'current', target: '+50%', impact: 4, effort: 3 }],
  'Too much travel / traffic': [{ title: 'Field route planning to cut Cairo traffic time', ar: 'تخطيط خطوط السير لتقليل وقت المرور', description: 'Plan visits by area and day, combine deliveries and service visits.', kpi: 'Hours on the road per visit', baseline: 'measure', target: '-25%', impact: 4, effort: 2 }],
}
