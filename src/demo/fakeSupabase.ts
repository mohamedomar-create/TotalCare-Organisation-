// @ts-nocheck
// Demo mode only (VITE_DEMO=1): answers every Supabase call in the browser from sample data,
// so the survey and dashboard can be tried with nothing saved to TotalCare.
const REF = 'ijsxhfvtcvvvjqxwvjlo'
const STORE = 'tc-demo-v4'
const ADMIN = { id: 'aaaaaaaa-0000-0000-0000-000000000001', email: 'mohamed.omar@totalcareegypt.com', full_name: 'Mohamed Omar', role: 'admin' }
const STAFF = { id: 'bbbbbbbb-0000-0000-0000-000000000002', email: 'sara.ali@totalcareegypt.com', full_name: 'Sara Ali', role: 'staff' }
const HELPER = { id: 'cccccccc-0000-0000-0000-000000000003', email: 'nour.hassan@totalcareegypt.com', full_name: 'Nour Hassan', role: 'distributor' }
const INVITE_CODE = 'HASSAN2026'
const DEPTS = ['marketing', 'installations', 'collections', 'accounting', 'sales', 'maintenance', 'purchasing', 'hr_legal']
let seq = 0
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`
const now = () => new Date().toISOString()

const db = {
  profiles: [ADMIN, STAFF, HELPER, ...['Mona Adel', 'Karim Mostafa', 'Hana Farouk', 'Omar Khaled', 'Laila Samir'].map((n, i) => ({ id: uuid(), email: `p${i}@totalcareegypt.com`, full_name: n, role: 'staff' }))],
  departments: [], people: [], submissions: [], receipts: [], safe_voice: [], initiatives: [], initiative_updates: [], initiative_supporters: [],
  submission_reviews: [], feedback: [], app_settings: [{ id: 1, submissions_per_person: 1 }], invitations: [],
}
// 24 realistic answers for the showcase.
const COMMENTS = {
  marketing: { s: ['Great events and workshops with doctors', 'تنظيم المؤتمرات ممتاز', 'Good brochures and catalogues'], w: ['Materials arrive late before tenders', 'مفيش تواصل كفاية مع المبيعات', 'Slow to reply to sales requests'], i: ['Plan the event calendar 3 months ahead', 'اجتماع شهري مع المبيعات'] },
  installations: { s: ['Very careful and professional engineers', 'بيركبوا بسرعة ودقة', 'Good training for nurses'], w: ['Delays when spare parts are missing', 'ضغط شغل كبير وعدد الفنيين قليل', 'Late reports after installation'], i: ['Checklist signed by the hospital after each install'] },
  collections: { s: ['Follow-up is consistent', 'متابعة كويسة مع العملاء'], w: ['Late collections from government hospitals', 'تأخير في التحصيل من المستشفيات الحكومية', 'No clear follow-up plan'], i: ['Weekly collections meeting with sales'] },
  accounting: { s: ['Accurate reports', 'محترمين في التعامل'], w: ['Payments to suppliers are always late', 'تأخير في صرف المستحقات', 'Too much paperwork and signatures', 'بطء في الرد على الاستفسارات'], i: ['Approve payments in Odoo every Sunday', 'توقيعين بس على أي صرف'] },
  sales: { s: ['Strong relationships with hospitals', 'علاقات قوية مع الدكاترة', 'Very helpful team'], w: ['Orders come on WhatsApp, not Odoo', 'Promises delivery dates we cannot meet'], i: ['All orders in Odoo, WhatsApp only to notify'] },
  maintenance: { s: ['Fast response to hospitals', 'بيردوا بسرعة وبيساعدوا', 'Very skilled engineers'], w: ['Spare parts not available on time', 'Not enough engineers in Upper Egypt'], i: ['Minimum stock for critical spare parts'] },
  purchasing: { s: ['Good supplier relationships', 'متعاونين'], w: ['Stock-outs on fast-moving items', 'تأخير الشحنات والجمارك', 'No visibility on shipment dates'], i: ['90-day import plan shared with sales'] },
  hr_legal: { s: ['Contracts are clear', 'بيتعاملوا باحترام'], w: ['Slow approvals for leaves and loans', 'No clear career path', 'Late replies on insurance'], i: ['Career ladder for engineers and reps'] },
}
const BASE_SCORE = { marketing: 6.5, installations: 7.8, collections: 5.4, accounting: 4.3, sales: 7.4, maintenance: 8.6, purchasing: 5.8, hr_legal: 6.2 }
const MANAGERS = ['Eng. Ahmed Hassan', 'Dr. Hala Mostafa', 'Tarek Fawzy', 'م. احمد حسن', 'Mona Adel']
const EMPLOYEES = ['Mona Adel', 'Karim Mostafa', 'Hana Farouk', 'mona adel', 'Omar Khaled', 'Laila Samir', 'كريم مصطفى']
const PROBLEMS = ['Late payments & collections', 'Too many signatures / approvals', 'Work runs on WhatsApp, not a system', 'Customs & import delays', 'Salary not keeping up with prices', 'Stock or spare parts not available on time', 'Government tenders pay late']
const STRENGTHS = ['Hospitals and doctors trust us', 'Strong brands and suppliers', 'Experienced engineers and technicians', 'Good team spirit', 'Salaries paid on time']
const IDEAS = ['One approval matrix: max 2 signatures for any order', 'Monthly TotalCare Star award per department', 'Move all orders to Odoo', 'Route planning by area to cut traffic time', 'Shared demo-device calendar', 'Training day every month on new products', 'Weekly collections war-room']
const LEVELS = ['Staff / technician', 'Engineer / specialist / rep', 'Supervisor / team lead', 'Manager / head', 'Driver / worker / assistant']
const TENURES = ['Less than 1 year', '1–3 years', '3–5 years', 'More than 5 years']
const LOCS = ['Head office (Cairo)', 'Alexandria & Delta', 'Upper Egypt', 'In the field (hospitals, patients’ homes)', 'Warehouse']
let r0 = 7
const rand = () => { r0 = (r0 * 9301 + 49297) % 233280; return r0 / 233280 }
const pick = (xs) => xs[Math.floor(rand() * xs.length)]
for (let i = 0; i < 24; i++) {
  const my = DEPTS[i % DEPTS.length]
  const depts = Object.fromEntries(DEPTS.map((d) => {
    if (d === 'hr_legal' && i % 5 === 0) return [d, { skip: true }]
    const own = d === my
    const score = Math.max(1, Math.min(10, Math.round(BASE_SCORE[d] + (rand() - 0.5) * 3 + (own ? 2 : 0))))
    const c = COMMENTS[d]
    return [d, { score, strengths: rand() < 0.55 ? pick(c.s) : '', weaknesses: rand() < 0.6 ? pick(c.w) : '', ideas: rand() < 0.25 ? pick(c.i) : '' }]
  }))
  const day = `2026-11-${String(3 + (i % 6)).padStart(2, '0')}`
  const low = i === 7 || i === 19
  if (i === 19) for (const d of DEPTS) depts[d] = { score: 8 }
  db.submissions.push({
    id: uuid(), author_id: i % 3 === 0 ? null : db.profiles[2 + (i % 5)].id, anonymous: i % 3 === 0, status: 'submitted', submitted_at: day + 'T10:00:00Z', created_at: day, updated_at: day,
    department_id: null, role_level: pick(LEVELS), ratings: {}, responsibility_tags: [], challenge_tags: [], ideas: [], structure: { roles: [] }, responsibilities: '', challenges: '', suggestions: '', quick_win: '', enps: null, current_step: 5,
    quality: low ? { score: 35, level: 'low', straight_lined: i === 19, rushed: true, minutes: 1.4 } : { score: 90 + (i % 10), level: 'high', minutes: 6 + (i % 9) },
    answers: {
      v: 2, my_dept: my, tenure: pick(TENURES), location: pick(LOCS), depts,
      best_managers: [{ name: pick(MANAGERS), reason: 'Listens and supports the team' }, { name: pick(MANAGERS) }],
      best_departments: [i % 4 === 0 ? my : 'maintenance', pick(['installations', 'sales', 'marketing'])],
      best_employees: [{ name: pick(EMPLOYEES), reason: 'Always ready to help' }, { name: pick(EMPLOYEES.slice(4)) }],
      company_problems: [pick(PROBLEMS), pick(PROBLEMS)],
      company_strengths: [pick(STRENGTHS), pick(STRENGTHS)],
      company_ideas: [pick(IDEAS), rand() < 0.4 ? pick(IDEAS) : ''],
      reward_code: i % 3 === 0 ? `IDEA-${String(1000 + i)}AB` : undefined,
    },
  })
}
db.profiles.push(...Array.from({ length: 14 }, (_, k) => ({ id: uuid(), email: `x${k}@totalcareegypt.com`, full_name: `Colleague ${k + 1}`, role: 'staff', active: true })))
db.invitations.push(
  { id: uuid(), code: 'HASSAN2026', full_name: 'Hassan Mahmoud', email: null, phone: '01012345678', department_id: null, role: 'staff', max_uses: 1, uses: 0, expires_at: new Date(Date.now() + 30 * 86400000).toISOString(), revoked: false, used_by: null, last_used_at: null, created_at: now() },
)
let currentUser = STAFF
const distributes = () => currentUser.role === 'admin' || currentUser.role === 'distributor'
function rows(table) {
  if (table === 'submissions' && currentUser.role !== 'admin') return db.submissions.filter((s) => s.author_id === currentUser.id)
  if (table === 'profiles' && !distributes()) return db.profiles.filter((p) => p.id === currentUser.id)
  if (table === 'invitations' && !distributes()) return []
  if (table === 'safe_voice' && currentUser.role !== 'admin') return []
  if (table === 'receipts') return db.receipts
  return db[table] ?? []
}
function applyFilters(list, params) {
  let out = [...list]
  for (const [k, v] of params) {
    if (['select', 'order', 'limit', 'offset', 'columns', 'on_conflict'].includes(k)) continue
    const m = v.match(/^(eq|neq|gte|in)\.(.*)$/)
    if (!m) continue
    out = out.filter((r) => {
      const x = r[k] === null || r[k] === undefined ? 'null' : String(r[k])
      if (m[1] === 'eq') return x === m[2]
      if (m[1] === 'neq') return x !== m[2]
      if (m[1] === 'gte') return x !== '' && !isNaN(+x) && !isNaN(+m[2]) ? +x >= +m[2] : x >= m[2]
      return true
    })
  }
  return out
}

const rpc = {
  my_submission_allowance: () => ({ allowed: 1, used: db.submissions.filter((s) => s.author_id === currentUser.id).length + db.receipts.filter((r) => r.user_id === currentUser.id).length }),
  survey_progress: () => ({ responses: db.submissions.filter((s) => s.status === 'submitted').length, people: db.profiles.length }),
  set_results_published: ({ p_on }) => {
    if (currentUser.role !== 'admin') throw new Error('Only the super admin can share the results')
    db.app_settings[0].results_published = p_on
    return null
  },
  // Same rules as the database function: no raw answers, 3+ ratings per department, 2+ people per written answer.
  results_summary: () => {
    const published = Boolean(db.app_settings[0].results_published)
    const member = db.profiles.find((p) => p.id === currentUser.id)?.active !== false
    if (!(currentUser.role === 'admin' || currentUser.role === 'management' || (member && published))) return { published: false, allowed: false }
    const subs = db.submissions.filter((x) => x.status === 'submitted' && x.answers?.v === 2).map((x) => x.answers)
    const norm = (t) => String(t ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
    const top = (texts, n, min = 2) => {
      const m = new Map()
      for (const t of texts) { const k = norm(t); if (!k) continue; const r = m.get(k) ?? { text: String(t).trim(), count: 0 }; r.count++; m.set(k, r) }
      return [...m.values()].filter((r) => r.count >= min).sort((a, b) => b.count - a.count || a.text.localeCompare(b.text)).slice(0, n)
    }
    const others = []
    for (const a of subs) for (const [k, r] of Object.entries(a.depts ?? {})) if (!r.skip && typeof r.score === 'number' && a.my_dept !== k) others.push({ dept: k, score: r.score, r })
    const avg = (xs) => (xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 10) / 10 : null)
    const departments = DEPTS.map((key) => {
      const rs = others.filter((o) => o.dept === key)
      const ok = rs.length >= 3
      const split = (f) => rs.flatMap((o) => String(o.r[f] ?? '').split(',')).map((t) => t.trim()).filter(Boolean)
      return { key, n: rs.length, avg: ok ? avg(rs.map((o) => o.score)) : null, high: ok ? rs.filter((o) => o.score >= 9).length : null, low: ok ? rs.filter((o) => o.score <= 4).length : null,
        strengths: ok ? top(split('strengths'), 3) : [], weaknesses: ok ? top(split('weaknesses'), 3) : [] }
    }).filter((d) => d.n > 0)
    const noms = (field, isDept) => {
      const m = new Map()
      for (const a of subs) (a[field] ?? []).slice(0, 3).forEach((x, i) => {
        const name = isDept ? x : x?.name; const k = norm(name); if (!k) return
        const r = m.get(k) ?? { [isDept ? 'key' : 'name']: String(name).trim(), points: 0, votes: 0, firsts: 0 }
        r.points += 3 - i; r.votes++; if (i === 0) r.firsts++; m.set(k, r)
      })
      return [...m.values()].filter((r) => r.votes >= 2).sort((a, b) => b.points - a.points || b.votes - a.votes).slice(0, 3)
    }
    return {
      published, allowed: true, responses: subs.length, people: db.profiles.filter((p) => p.active !== false).length,
      company: { avg: avg(others.map((o) => o.score)), n: others.length, high: others.filter((o) => o.score >= 9).length, low: others.filter((o) => o.score <= 4).length },
      departments,
      problems: top(subs.flatMap((a) => a.company_problems ?? []), 6), strengths: top(subs.flatMap((a) => a.company_strengths ?? []), 6),
      best_departments: noms('best_departments', true), best_managers: noms('best_managers'), best_employees: noms('best_employees'),
      ideas: subs.flatMap((a) => a.company_ideas ?? []).filter((t) => String(t).trim()).length,
    }
  },
  survey_dept_counts: () => {
    if (!distributes()) return []
    const m = new Map()
    for (const s of db.submissions) if (s.status === 'submitted' && s.answers?.v === 2) m.set(s.answers.my_dept ?? '', (m.get(s.answers.my_dept ?? '') ?? 0) + 1)
    return [...m].map(([dept, answers]) => ({ dept, answers }))
  },
  survey_participants: () => distributes() ? [...db.submissions.filter((s) => s.author_id && s.status === 'submitted').map((s) => ({ user_id: s.author_id })), ...db.receipts.map((r) => ({ user_id: r.user_id }))] : [],
  staff_list: () => db.profiles.map((p) => ({ id: p.id, full_name: p.full_name, job_title: '', department_id: null, joined_on: null })),
  initiative_counts: () => {
    const m = new Map()
    for (const s of db.initiative_supporters) {
      const r = m.get(s.initiative_id) ?? { initiative_id: s.initiative_id, supporters: 0, volunteers: 0 }
      s.kind === 'support' ? r.supporters++ : r.volunteers++
      m.set(s.initiative_id, r)
    }
    return [...m.values()]
  },
  submit_survey: ({ p_id, p_anonymous, p_quality }) => {
    const d = db.submissions.find((s) => s.id === p_id && s.author_id === currentUser.id)
    if (!d) throw new Error('Survey not found')
    if (!p_anonymous) { Object.assign(d, { status: 'submitted', submitted_at: now(), quality: p_quality }); return p_id }
    db.submissions = db.submissions.filter((s) => s !== d)
    const n = { ...d, id: uuid(), author_id: null, anonymous: true, status: 'submitted', submitted_at: now().slice(0, 10) + 'T00:00:00Z', quality: p_quality }
    db.submissions.push(n)
    db.receipts.push({ user_id: currentUser.id })
    return n.id
  },
  safe_voice_send: ({ p_category, p_message, p_department }) => {
    const code = 'TC-' + Math.random().toString(36).slice(2, 10).toUpperCase().replace(/[01OI]/g, 'X')
    db.safe_voice.push({ id: uuid(), code, category: p_category, message: p_message, department_id: p_department, status: 'new', reply: '', created_at: now().slice(0, 10), replied_at: null })
    return code
  },
  invite_preview: ({ p_code }) => db.invitations.filter((i) => i.code === p_code.trim().toUpperCase()).map((i) => ({ full_name: i.full_name, department: '', valid: !i.revoked && i.uses < i.max_uses, team: i.max_uses > 1 })),
  redeem_invite: ({ p_code, p_name }) => {
    const inv = db.invitations.find((i) => i.code === p_code.trim().toUpperCase() && !i.revoked && i.uses < i.max_uses)
    if (!inv) throw new Error('This invitation link is not valid any more. Ask HR for a new one.')
    if (inv.email) throw new Error(`This invitation is for ${inv.email}. Sign in with that e-mail instead.`)
    const me = db.profiles.find((p) => p.id === currentUser.id)
    if (me.active !== false) return null
    Object.assign(me, { active: true, full_name: p_name || inv.full_name, phone: inv.phone })
    inv.uses++
    return null
  },
  safe_voice_check: ({ p_code }) => db.safe_voice.filter((m) => m.code === p_code.trim().toUpperCase()).map(({ category, status, reply, created_at, replied_at }) => ({ category, status, reply, created_at, replied_at })),
}

function defaults(table) {
  if (table === 'submissions') return { author_id: currentUser.id, status: 'draft', ratings: {}, answers: {}, quality: {}, anonymous: false, responsibility_tags: [], challenge_tags: [], ideas: [], structure: { roles: [] }, responsibilities: '', challenges: '', suggestions: '', quick_win: '', enps: null, current_step: 0, role_level: '', department_id: null, submitted_at: null }
  if (table === 'invitations') return { full_name: '', email: null, phone: '', department_id: null, role: 'staff', max_uses: 1, uses: 0, expires_at: new Date(Date.now() + 30 * 86400000).toISOString(), revoked: false }
  if (table === 'initiatives') return { description: '', theme: '', owner_name: '', status: 'proposed', impact: 3, effort: 3, kpi: '', baseline: '', target: '', progress: 0, visible: false, source: '', rewarded: false, reward_code: '', created_by: currentUser.id, start_date: null, due_date: null, department_id: null }
  return {}
}



// ---- persistence (per viewer, best effort) ----
let view = 'staff' // staff | distributor | admin | invite
try {
  const saved = JSON.parse(localStorage.getItem(STORE) || 'null')
  if (saved?.db) { Object.assign(db, saved.db); seq = saved.seq || seq }
  if (saved?.view) view = saved.view
  currentUser = db.profiles.find((p) => p.id === saved?.user) || STAFF
} catch { /* private window: start fresh */ }
const save = () => { try { localStorage.setItem(STORE, JSON.stringify({ db, seq, view, user: currentUser.id })) } catch { /* ignore */ } }

function seedSession(u) {
  try {
    const exp = Math.floor(Date.now() / 1000) + 3600 * 24
    localStorage.setItem(`sb-${REF}-auth-token`, JSON.stringify({ access_token: 'x.y.z', token_type: 'bearer', expires_in: 86400, expires_at: exp, refresh_token: 'r', user: { id: u.id, email: u.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} } }))
  } catch { /* ignore */ }
}
function clearSession() { try { localStorage.removeItem(`sb-${REF}-auth-token`) } catch { /* ignore */ } }
if (view === 'invite' && !db.profiles.some((p) => p.id === currentUser.id && p.email.endsWith('@invite.local'))) clearSession()
else seedSession(currentUser)

export const demo = {
  view: () => view,
  start: () => (view === 'invite' && !currentUser.email.endsWith('@invite.local') ? `/join/${INVITE_CODE}` : view === 'admin' ? '/admin' : view === 'distributor' ? '/admin/invitations' : '/'),
  switchTo(next) {
    view = next
    if (next === 'invite') { currentUser = STAFF; save(); clearSession(); return }
    currentUser = db.profiles.find((p) => p.id === (next === 'admin' ? ADMIN.id : next === 'distributor' ? HELPER.id : STAFF.id))
    save(); seedSession(currentUser)
  },
  reset() { try { localStorage.removeItem(STORE) } catch { /* ignore */ } },
}

const reply = (body, status = 200, headers = {}) => new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })

async function handle(req) {
  const url = new URL(req.url)
  const path = url.pathname
  const method = req.method
  const text = method === 'GET' || method === 'HEAD' ? '' : await req.text()
  const body = text ? JSON.parse(text) : {}
  if (path.startsWith('/auth/v1/signup')) {
    const guest = { id: uuid(), email: `guest-${seq}@invite.local`, full_name: '', role: 'staff', active: false }
    db.profiles.push(guest)
    currentUser = guest
    save()
    const exp = Math.floor(Date.now() / 1000) + 86400
    return reply({ access_token: 'g.g.g', token_type: 'bearer', expires_in: 86400, expires_at: exp, refresh_token: 'rg', user: { id: guest.id, aud: 'authenticated', role: 'authenticated', is_anonymous: true, app_metadata: {}, user_metadata: {} } })
  }
  if (path.startsWith('/auth/v1/logout')) { clearSession(); return reply({}, 204) }
  if (path.startsWith('/auth/v1/user')) return reply({ id: currentUser.id, email: currentUser.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} })
  if (path.startsWith('/auth/v1/token')) {
    const exp = Math.floor(Date.now() / 1000) + 86400
    return reply({ access_token: 'x.y.z', token_type: 'bearer', expires_in: 86400, expires_at: exp, refresh_token: 'r', user: { id: currentUser.id, email: currentUser.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} } })
  }
  if (path.startsWith('/auth/v1/')) return reply({})
  if (path.startsWith('/functions/v1/')) return reply({ ok: true })
  if (path.startsWith('/rest/v1/rpc/')) {
    const fn = rpc[path.split('/').pop()]
    if (!fn) return reply([])
    try { const r = fn(body); save(); return reply(r ?? null) } catch (e) { return reply({ message: e.message, code: 'P0001' }, 400) }
  }
  if (path.startsWith('/rest/v1/')) {
    const table = path.split('/').pop()
    const single = (req.headers.get('accept') ?? '').includes('vnd.pgrst.object')
    if (method === 'GET' || method === 'HEAD') {
      const list = applyFilters(rows(table), url.searchParams)
      if (single) return list[0] ? reply(list[0]) : reply({ message: 'not found', code: 'PGRST116' }, 406)
      return reply(list, 200, { 'content-range': `0-${list.length}/${list.length}` })
    }
    if (method === 'POST') {
      const items = (Array.isArray(body) ? body : [body]).map((b) => ({ id: uuid(), created_at: now(), updated_at: now(), ...defaults(table), ...b }))
      if (table === 'submissions' && db.submissions.filter((s) => s.author_id === currentUser.id).length + db.receipts.filter((r) => r.user_id === currentUser.id).length >= 1) return reply({ message: 'You have already shared your view. Press “Reset demo” to try again.' }, 400)
      db[table] = [...(db[table] ?? []), ...items]
      save()
      return reply(single ? items[0] : items, 201)
    }
    if (method === 'PATCH') {
      const list = applyFilters(rows(table), url.searchParams)
      for (const r of list) Object.assign(r, body, { updated_at: now() })
      save()
      return reply(single ? list[0] : list)
    }
    if (method === 'DELETE') {
      const list = applyFilters(rows(table), url.searchParams)
      db[table] = (db[table] ?? []).filter((r) => !list.includes(r))
      save()
      return reply([])
    }
  }
  return reply({})
}

const realFetch = window.fetch.bind(window)
window.fetch = async (input, init) => {
  const req = new Request(input, init)
  if (req.url.startsWith(`https://${REF}.supabase.co/`)) return handle(req)
  return realFetch(input, init)
}
// The demo runs inside a frame where dialogs are blocked: treat "Are you sure?" as yes.
window.confirm = () => true
window.WebSocket = class { constructor() { setTimeout(() => this.onclose?.({ code: 1000 }), 0) } send() {} close() {} addEventListener() {} removeEventListener() {} }
