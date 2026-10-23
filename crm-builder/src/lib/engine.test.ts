import { describe, expect, it } from 'vitest'
import { TEMPLATES, templateById } from './templates'
import { emptyAnswers, generateSchema, suggest } from './recommend'
import { validate } from './validate'
import { emptyData, type User, type Workspace } from './types'
import { seedSampleData } from './seed'
import { createRecord, list, moveStage, onHand, postDocument, registerPayment, runScheduled, trialBalance, voidDocument, type Ctx } from './engine'
import { moduleByRole, uid } from './schema'
import { evalFormula, formulaRefs } from './formula'

const admin: User = { id: 'u_admin', name: 'Admin', email: 'a@x.com', roleId: 'role_admin' }

function workspace(templateId = 'distribution', challenges: string[] = ['late_collections', 'stock_mismatch', 'lost_leads']) {
  const answers = { ...emptyAnswers('Test Co'), challenges, taxId: '123-456-789' }
  const schema = generateSchema(templateById(templateId), answers)
  const ws: Workspace = { id: 'ws', createdAt: '', answers, users: [admin], draft: schema, published: schema, history: [], data: emptyData() }
  return { ws, schema, ctx: { ws, schema, user: admin } as Ctx }
}

function balanced(ws: Workspace) {
  const tb = trialBalance(ws)
  const dr = tb.reduce((s, [, r]) => s + r.debit, 0)
  const cr = tb.reduce((s, [, r]) => s + r.credit, 0)
  return Math.abs(dr - cr) < 0.005
}

describe('templates', () => {
  for (const t of TEMPLATES) {
    it(`${t.id} generates a schema with no errors`, () => {
      const schema = generateSchema(t, { ...emptyAnswers('Co'), taxId: '1', challenges: ['lost_leads', 'late_collections', 'accountability', 'purchasing', 'service_delays'], aftersales: true })
      const errors = validate(schema).filter((i) => i.level === 'error')
      expect(errors).toEqual([])
    })
    it(`${t.id} sample data keeps the books balanced`, () => {
      const answers = { ...emptyAnswers('Co'), taxId: '1' }
      const schema = generateSchema(t, answers)
      const ws: Workspace = { id: 'ws', createdAt: '', answers, users: [admin], draft: schema, published: schema, history: [], data: emptyData() }
      seedSampleData(ws, schema, admin)
      expect(balanced(ws)).toBe(true)
      const products = moduleByRole(schema, 'products')
      for (const p of products ? list(ws, products.id) : []) expect(Number(p.values.stock)).toBe(onHand(ws, p.id))
    })
  }

  it('ranks the medical template first for a medical company', () => {
    const s = suggest({ ...emptyAnswers('X'), industry: 'medical', aftersales: true, channels: ['tenders'] })
    expect(s[0].template.id).toBe('medical')
  })
})

describe('documents', () => {
  it('posts a bill and an invoice with correct VAT, stock, cost and journals', () => {
    const { ws, schema, ctx } = workspace()
    const products = moduleByRole(schema, 'products')!
    const p = createRecord(ctx, products.id, { name: 'Widget', sku: 'W1', price: 100, vat_rate: 14, track_stock: true })
    const supplier = createRecord(ctx, moduleByRole(schema, 'suppliers')!.id, { name: 'Supplier' })
    const bill = createRecord(ctx, moduleByRole(schema, 'purchases')!.id, { supplier: supplier.id, date: '2026-01-10' }, { lines: [{ id: uid('l'), product: p.id, description: 'Widget', qty: 10, price: 60, discount: 0, vat: 14 }] })
    postDocument(ctx, bill)
    expect(bill.number).toBe('BILL-2026-0001')
    expect(onHand(ws, p.id)).toBe(10)
    expect(p.values.cost).toBe(60)

    const customer = createRecord(ctx, moduleByRole(schema, 'accounts')!.id, { name: 'Customer', owner: admin.id })
    const inv = createRecord(ctx, moduleByRole(schema, 'invoices')!.id, { customer: customer.id, date: '2026-01-15' }, { lines: [{ id: uid('l'), product: p.id, description: 'Widget', qty: 3, price: 100, discount: 10, vat: 14 }] })
    expect(inv.values.subtotal).toBe(270)
    expect(inv.values.tax).toBe(37.8)
    expect(inv.values.total).toBe(307.8)
    postDocument(ctx, inv)
    expect(inv.number).toBe('INV-2026-0001')
    expect(onHand(ws, p.id)).toBe(7)
    expect(balanced(ws)).toBe(true)
    const cogs = ws.data.journal.find((j) => j.doc === inv.id)!.lines.find((l) => l.account === '5000')!
    expect(cogs.debit).toBe(180)

    expect(() => registerPayment(ctx, inv, 400, '2026-01-20', 'bank')).toThrow(/more than the balance/)
    registerPayment(ctx, inv, 100, '2026-01-20', 'cash')
    expect(inv.status).toBe('partial')
    registerPayment(ctx, inv, 207.8, '2026-01-21', 'bank')
    expect(inv.status).toBe('paid')
    expect(inv.values.balance).toBe(0)
    expect(balanced(ws)).toBe(true)
  })

  it('blocks overselling and keeps numbering gapless', () => {
    const { ws, schema, ctx } = workspace()
    const p = createRecord(ctx, moduleByRole(schema, 'products')!.id, { name: 'Rare', sku: 'R1', price: 50, vat_rate: 14, track_stock: true })
    const c = createRecord(ctx, moduleByRole(schema, 'accounts')!.id, { name: 'C', owner: admin.id })
    const inv = createRecord(ctx, moduleByRole(schema, 'invoices')!.id, { customer: c.id, date: '2026-02-01' }, { lines: [{ id: uid('l'), product: p.id, description: 'Rare', qty: 1, price: 50, discount: 0, vat: 14 }] })
    expect(() => postDocument(ctx, inv)).toThrow(/Not enough stock/)
    expect(inv.status).toBe('draft')
    expect(ws.data.sequences['INV-2026'] ?? 0).toBe(0)
  })

  it('voiding reverses stock and journals', () => {
    const { ws, schema, ctx } = workspace()
    const p = createRecord(ctx, moduleByRole(schema, 'products')!.id, { name: 'A', sku: 'A1', price: 10, vat_rate: 14, track_stock: true })
    const s = createRecord(ctx, moduleByRole(schema, 'suppliers')!.id, { name: 'S' })
    const bill = createRecord(ctx, moduleByRole(schema, 'purchases')!.id, { supplier: s.id, date: '2026-03-01' }, { lines: [{ id: uid('l'), product: p.id, description: 'A', qty: 5, price: 4, discount: 0, vat: 14 }] })
    postDocument(ctx, bill)
    voidDocument(ctx, bill)
    expect(onHand(ws, p.id)).toBe(0)
    expect(bill.status).toBe('void')
    expect(balanced(ws)).toBe(true)
    const tb = new Map(trialBalance(ws))
    expect(tb.get('1300')!.debit - tb.get('1300')!.credit).toBe(0)
  })
})

describe('pipelines and automations', () => {
  it('enforces stage gates', () => {
    const { schema, ctx } = workspace('medical')
    const deals = moduleByRole(schema, 'deals')!
    const acc = createRecord(ctx, moduleByRole(schema, 'accounts')!.id, { name: 'Hospital', owner: admin.id })
    const deal = createRecord(ctx, deals.id, { title: 'Tender', account: acc.id, amount: 1000, close_date: '2026-05-01' })
    const technical = deals.stages!.find((s) => s.name === 'Technical offer')!
    expect(() => moveStage(ctx, deal, technical.id)).toThrow(/Tender no/)
  })

  it('creates a follow-up task for a new lead and collection tasks for overdue invoices', () => {
    const { ws, schema, ctx } = workspace()
    const tasks = moduleByRole(schema, 'tasks')!
    createRecord(ctx, moduleByRole(schema, 'leads')!.id, { name: 'Lead', phone: '+20 1012345678', source: 'facebook' })
    expect(list(ws, tasks.id).some((t) => String(t.values.title).startsWith('Call Lead'))).toBe(true)

    const c = createRecord(ctx, moduleByRole(schema, 'accounts')!.id, { name: 'Late payer', owner: admin.id })
    const svc = createRecord(ctx, moduleByRole(schema, 'products')!.id, { name: 'Service', sku: 'S1', price: 100, vat_rate: 14, track_stock: false })
    const inv = createRecord(ctx, moduleByRole(schema, 'invoices')!.id, { customer: c.id, date: '2026-01-01', due_date: '2026-01-31' }, { lines: [{ id: uid('l'), product: svc.id, description: 'Service', qty: 1, price: 100, discount: 0, vat: 14 }] })
    postDocument(ctx, inv)
    expect(runScheduled({ ...ctx, today: '2026-02-05' })).toBe(1)
    expect(runScheduled({ ...ctx, today: '2026-02-06' })).toBe(0)
    expect(list(ws, tasks.id).some((t) => String(t.values.title).includes('Late payer'))).toBe(true)
  })
})

describe('validator', () => {
  it('catches broken references and pipelines', () => {
    const { schema } = workspace()
    const deals = moduleByRole(schema, 'deals')!
    deals.stages = deals.stages!.filter((s) => s.type !== 'won')
    schema.reports[0].measure = { op: 'sum', field: 'customer' }
    const msgs = validate(schema).map((i) => i.message).join('\n')
    expect(msgs).toMatch(/exactly one Won/)
    expect(msgs).toMatch(/not a number/)
  })
})

describe('formula', () => {
  it('evaluates safely', () => {
    expect(evalFormula('area * price_per_m2', { area: 120, price_per_m2: 30000 })).toBe(3600000)
    expect(evalFormula('(a + b) / 2', { a: 3, b: 4 })).toBe(3.5)
    expect(formulaRefs('a*b - c')).toEqual(['a', 'b', 'c'])
    expect(() => formulaRefs('alert(1);')).toThrow()
  })
})
