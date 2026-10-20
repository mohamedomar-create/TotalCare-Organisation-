// Sends TotalCare Organisation e-mails through Resend.
// Called by the database (submission / feedback / idea / reward request / report / daily tick) with a shared secret,
// or by a signed-in admin from the Email settings page (test / digest now).
//
// Secrets (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY  required to actually send
//   EMAIL_FROM      optional, e.g. "TotalCare Organisation <noreply@totalcareegypt.com>"
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RATINGS: [string, string][] = [
  ['clarity', 'I know exactly what my job is'],
  ['structure', 'I know who my direct manager is'],
  ['communication', 'I get information on time'],
  ['decisions', 'Decisions and approvals are fast'],
  ['workload', 'My workload is fair'],
  ['tools', 'I have the tools I need'],
  ['collaboration', 'Departments help each other'],
  ['growth', 'I see a future at TotalCare'],
]
const FACES = ['', 'No', 'Not really', 'Sometimes', 'Mostly', 'Yes']
const CATEGORY: Record<string, string> = { idea: '💡 Idea', issue: '⚠️ Problem', question: '❓ Question', praise: '👏 Thanks' }

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

/* ---------------- e-mail layout ---------------- */

function layout(title: string, body: string, appUrl: string, linkPath = '/admin') {
  const button = appUrl
    ? `<p style="margin:24px 0 0"><a href="${esc(appUrl + linkPath)}" style="background:#0e7490;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Open in TotalCare Organisation</a></p>`
    : ''
  return `<!doctype html><html><body style="margin:0;background:#f4f6fa;font-family:Segoe UI,Arial,sans-serif;color:#0f172a">
<div style="max-width:640px;margin:0 auto;padding:24px">
<div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:24px">
<p style="margin:0 0 4px;color:#0e7490;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">TotalCare Organisation</p>
<h1 style="margin:0 0 16px;font-size:20px">${esc(title)}</h1>
${body}
${button}
</div>
<p style="color:#64748b;font-size:12px;text-align:center;margin-top:12px">Confidential — for the project admin. Please do not forward names to management.</p>
</div></body></html>`
}

const h2 = (t: string) => `<h2 style="font-size:15px;margin:20px 0 8px">${esc(t)}</h2>`
const p = (t: string) => `<p style="margin:4px 0;line-height:1.5">${t}</p>`
const list = (items: string[]) =>
  items.length ? `<ul style="margin:4px 0;padding-left:20px;line-height:1.6">${items.map((i) => `<li>${i}</li>`).join('')}</ul>` : p('<span style="color:#64748b">None</span>')

function bars(rows: { label: string; value: number; max: number; text: string }[]) {
  return `<table style="width:100%;border-collapse:collapse;font-size:13px">${rows
    .map(
      (r) => `<tr><td style="padding:3px 8px 3px 0;width:45%">${esc(r.label)}</td>
<td style="padding:3px 0"><div style="background:#f1f5f9;border-radius:4px;height:10px"><div style="background:#0e7490;border-radius:4px;height:10px;width:${Math.round((r.value / (r.max || 1)) * 100)}%"></div></div></td>
<td style="padding:3px 0 3px 8px;width:40px;text-align:right;font-weight:700">${esc(r.text)}</td></tr>`,
    )
    .join('')}</table>`
}

/* ---------------- data helpers ---------------- */

async function settings() {
  const { data } = await db.from('notification_settings').select('*').eq('id', 1).single()
  return data ?? { notify_submissions: true, notify_feedback: true, notify_reports: true, digest: 'weekly', extra_recipients: [], app_url: '' }
}

async function emailsFor(roles: string[], extra: string[] = []) {
  const { data } = await db.from('profiles').select('email').in('role', roles)
  return [...new Set([...(data ?? []).map((r) => r.email as string), ...extra.map((e) => e.trim()).filter(Boolean)])]
}

async function deptNames() {
  const { data } = await db.from('departments').select('id, name')
  return new Map((data ?? []).map((d) => [d.id as string, d.name as string]))
}

async function send(kind: string, to: string[], subject: string, html: string) {
  const key = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('EMAIL_FROM') || 'TotalCare Organisation <onboarding@resend.dev>'
  if (!to.length) {
    await db.from('email_log').insert({ kind, subject, recipients: to, status: 'skipped', error: 'No recipients' })
    return { sent: false, reason: 'No recipients' }
  }
  if (!key) {
    await db.from('email_log').insert({ kind, subject, recipients: to, status: 'skipped', error: 'RESEND_API_KEY is not set' })
    return { sent: false, reason: 'RESEND_API_KEY is not set' }
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html }),
  })
  const error = res.ok ? '' : await res.text()
  await db.from('email_log').insert({ kind, subject, recipients: to, status: res.ok ? 'sent' : 'failed', error: error.slice(0, 500) })
  return { sent: res.ok, reason: error || undefined }
}

/* ---------------- e-mail kinds ---------------- */

async function submissionEmail(id: string) {
  const s = await settings()
  if (!s.notify_submissions) return { sent: false, reason: 'Turned off' }
  const { data: sub } = await db.from('submissions').select('*').eq('id', id).single()
  if (!sub) return { sent: false, reason: 'Not found' }
  const [{ data: author }, depts] = await Promise.all([
    db.from('profiles').select('full_name, email').eq('id', sub.author_id).single(),
    deptNames(),
  ])
  const name = author?.full_name || author?.email || 'Someone'
  const board = sub.structure?.roles ? sub.structure : null
  const ideas = [sub.quick_win, ...(sub.ideas ?? [])].filter((x: string) => x?.trim())
  const body = [
    p(`<strong>${esc(name)}</strong> · ${esc(depts.get(sub.department_id) ?? 'Department not given')}${sub.role_level ? ' · ' + esc(sub.role_level) : ''}`),
    h2('Quick check'),
    bars(
      RATINGS.filter(([k]) => sub.ratings?.[k]).map(([k, label]) => ({ label, value: sub.ratings[k], max: 5, text: FACES[sub.ratings[k]] })),
    ),
    h2('Biggest problems (in order)'),
    list((sub.challenge_tags ?? []).map(esc)),
    sub.challenges ? p(`<em>“${esc(sub.challenges)}”</em>`) : '',
    h2('Ideas'),
    list(ideas.map(esc)),
    sub.suggestions ? p(`<em>“${esc(sub.suggestions)}”</em>`) : '',
    sub.enps !== null ? p(`Would recommend TotalCare as a workplace: <strong>${sub.enps}/10</strong>`) : '',
    board ? p(`Org chart: <strong>${board.roles.length}</strong> roles, <strong>${board.roles.reduce((a: number, r: { count: number }) => a + (r.count || 0), 0)}</strong> people.`) : '',
  ].join('')
  const to = await emailsFor(['admin'], s.extra_recipients)
  return send('submission', to, `New submission from ${name}`, layout(`New submission from ${name}`, body, s.app_url, `/admin/submissions/${id}`))
}

async function feedbackEmail(id: string) {
  const s = await settings()
  if (!s.notify_feedback) return { sent: false, reason: 'Turned off' }
  const { data: fb } = await db.from('feedback').select('*').eq('id', id).single()
  if (!fb) return { sent: false, reason: 'Not found' }
  const { data: author } = await db.from('profiles').select('full_name, email').eq('id', fb.author_id).single()
  const name = author?.full_name || author?.email || 'Someone'
  const body = p(`<strong>${esc(CATEGORY[fb.category] ?? fb.category)}</strong> from ${esc(name)}`) +
    `<blockquote style="margin:12px 0;padding:10px 14px;border-left:4px solid #0e7490;background:#f8fafc;white-space:pre-wrap" dir="auto">${esc(fb.message)}</blockquote>`
  const to = await emailsFor(['admin'], s.extra_recipients)
  return send('feedback', to, `${CATEGORY[fb.category] ?? 'Feedback'} from ${name}`, layout('New feedback', body, s.app_url, '/admin/inbox?tab=feedback'))
}

async function ideaEmail(id: string) {
  const s = await settings()
  if (!s.notify_feedback) return { sent: false, reason: 'Turned off' }
  const { data: idea } = await db.from('ideas').select('*').eq('id', id).single()
  if (!idea) return { sent: false, reason: 'Not found' }
  // The admin sees the real author even when the idea was posted without a name.
  const { data: link } = await db.from('idea_authors').select('author_id').eq('idea_id', id).maybeSingle()
  const { data: author } = link ? await db.from('profiles').select('full_name, email').eq('id', link.author_id).single() : { data: null }
  const name = author?.full_name || author?.email || 'Someone'
  const dept = idea.department_id ? (await deptNames()).get(idea.department_id) : null
  const body = p(`<strong>${esc(idea.title)}</strong>${dept ? ` · for ${esc(dept)}` : ''}`) +
    (idea.body ? `<blockquote style="margin:12px 0;padding:10px 14px;border-left:4px solid #f59e0b;background:#fffbeb;white-space:pre-wrap" dir="auto">${esc(idea.body)}</blockquote>` : '') +
    p(`Posted by ${esc(name)}${idea.anonymous ? ' — <em>without their name; colleagues only see “A colleague”. Keep it confidential.</em>' : ''}`)
  const to = await emailsFor(['admin'], s.extra_recipients)
  return send('idea', to, `💡 New idea: ${idea.title}`, layout('New idea shared', body, s.app_url, `/ideas/${id}`))
}

async function redemptionEmail(id: string) {
  const s = await settings()
  const { data: r } = await db.from('redemptions').select('*').eq('id', id).single()
  if (!r) return { sent: false, reason: 'Not found' }
  const [{ data: who }, { data: reward }] = await Promise.all([
    db.from('profiles').select('full_name, email').eq('id', r.user_id).single(),
    db.from('rewards').select('title, emoji').eq('id', r.reward_id).single(),
  ])
  const name = who?.full_name || who?.email || 'Someone'
  const body = p(`${esc(name)} used <strong>${r.cost} points</strong> for ${esc(reward?.emoji ?? '🎁')} <strong>${esc(reward?.title ?? 'a reward')}</strong>.`) +
    p('Please approve it and arrange the reward, or return the points, from Admin → Community.')
  const to = await emailsFor(['admin'], s.extra_recipients)
  return send('redemption', to, `🎁 Reward request from ${name}`, layout('Reward request', body, s.app_url, '/admin/community'))
}

async function reportEmail(id: string) {
  const s = await settings()
  if (!s.notify_reports) return { sent: false, reason: 'Turned off' }
  const { data: report } = await db.from('reports').select('title, stats').eq('id', id).single()
  if (!report) return { sent: false, reason: 'Not found' }
  const stats = report.stats ?? {}
  const body = [
    p(`A new anonymised summary of staff feedback is ready: <strong>${esc(report.title)}</strong>.`),
    p(`${stats.total ?? 0} staff members took part. No names are included.`),
    stats.challenges?.length ? h2('Top problems') + list(stats.challenges.slice(0, 5).map((c: { label: string; count: number }) => `${esc(c.label)} (${c.count})`)) : '',
  ].join('')
  const html = layout(report.title, body, s.app_url, `/reports/${id}`).replace(
    'Confidential — for the project admin. Please do not forward names to management.',
    'Anonymised summary for management.',
  )
  const to = await emailsFor(['management', 'admin'])
  return send('report', to, `Published: ${report.title}`, html)
}

async function digestEmail(days: number) {
  const s = await settings()
  const since = new Date(Date.now() - days * 86400000).toISOString()
  const [{ data: subs }, { data: fbs }, { data: profiles }, depts] = await Promise.all([
    db.from('submissions').select('*'),
    db.from('feedback').select('*').gte('created_at', since).order('created_at', { ascending: false }),
    db.from('profiles').select('id, full_name, email'),
    deptNames(),
  ])
  const who = new Map((profiles ?? []).map((p) => [p.id, p.full_name || p.email]))
  const all = subs ?? []
  const submitted = all.filter((x) => x.status === 'submitted')
  const fresh = submitted.filter((x) => x.submitted_at && x.submitted_at >= since)
  const drafts = all.filter((x) => x.status === 'draft').length
  const respondents = new Set(submitted.map((x) => x.author_id)).size
  const staff = (profiles ?? []).length

  const avg = RATINGS.map(([k, label]) => {
    const v = submitted.map((x) => x.ratings?.[k]).filter((n) => typeof n === 'number')
    const a = v.length ? v.reduce((x, y) => x + y, 0) / v.length : 0
    return { label, value: a, max: 5, text: v.length ? a.toFixed(1) : '—' }
  })
  const counts = new Map<string, number>()
  for (const x of submitted) for (const t of x.challenge_tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1)
  const top = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 6)
  const scores = submitted.map((x) => x.enps).filter((n) => typeof n === 'number')
  const enps = scores.length
    ? Math.round(((scores.filter((n) => n >= 9).length - scores.filter((n) => n <= 6).length) / scores.length) * 100)
    : null
  const ideas = fresh.flatMap((x) => [x.quick_win, ...(x.ideas ?? [])]).filter((i) => i?.trim())

  const period = days === 1 ? 'the last 24 hours' : `the last ${days} days`
  const body = [
    p(`In ${period}: <strong>${fresh.length}</strong> new submission(s) and <strong>${(fbs ?? []).length}</strong> feedback note(s).`),
    p(`Overall: <strong>${submitted.length}</strong> submitted · <strong>${drafts}</strong> drafts in progress · response rate <strong>${staff ? Math.round((respondents / staff) * 100) : 0}%</strong> (${respondents} of ${staff} signed-up staff)` +
      (enps !== null ? ` · eNPS <strong>${enps > 0 ? '+' : ''}${enps}</strong>` : '')),
    h2('Quick check — average (1–5)'),
    submitted.length ? bars(avg) : p('<span style="color:#64748b">No answers yet</span>'),
    h2('Top problems'),
    top.length ? bars(top.map(([label, n]) => ({ label, value: n, max: top[0][1], text: String(n) }))) : p('<span style="color:#64748b">None yet</span>'),
    h2(`New submissions (${fresh.length})`),
    list(fresh.map((x) => `${esc(who.get(x.author_id))} · ${esc(depts.get(x.department_id) ?? '—')}${x.challenge_tags?.[0] ? ' — ' + esc(x.challenge_tags[0]) : ''}`)),
    h2(`New ideas (${ideas.length})`),
    list(ideas.slice(0, 15).map((i) => `<span dir="auto">${esc(i)}</span>`)),
    h2(`New feedback (${(fbs ?? []).length})`),
    list((fbs ?? []).map((f) => `${esc(CATEGORY[f.category] ?? f.category)} · ${esc(who.get(f.author_id))}: <span dir="auto">${esc(f.message)}</span>`)),
  ].join('')
  const to = await emailsFor(['admin'], s.extra_recipients)
  const title = `${days === 1 ? 'Daily' : 'Weekly'} summary — ${fresh.length} new submission(s), ${(fbs ?? []).length} feedback`
  return send('digest', to, title, layout(title, body, s.app_url, '/admin'))
}

async function digestTick() {
  const s = await settings()
  if (s.digest === 'off') return { sent: false, reason: 'Summary turned off' }
  if (s.digest === 'daily') return digestEmail(1)
  // Weekly: Sundays, Cairo time (start of the Egyptian work week).
  const day = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Africa/Cairo' }).format(new Date())
  return day === 'Sun' ? digestEmail(7) : { sent: false, reason: 'Not Sunday' }
}

/* ---------------- entry point ---------------- */

async function isAdminRequest(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return false
  const { data } = await db.auth.getUser(token)
  if (!data.user) return false
  const { data: profile } = await db.from('profiles').select('role').eq('id', data.user.id).single()
  return profile?.role === 'admin'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  let payload: { type?: string; id?: string }
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Bad request' }, 400)
  }

  const secret = req.headers.get('x-notify-secret')
  const { data: expected } = await db.rpc('notify_secret')
  const fromDatabase = Boolean(secret && expected && secret === expected)
  const fromAdmin = !fromDatabase && (await isAdminRequest(req))
  if (!fromDatabase && !fromAdmin) return json({ error: 'Not allowed' }, 401)

  try {
    switch (payload.type) {
      case 'submission':
        return json(await submissionEmail(payload.id!))
      case 'feedback':
        return json(await feedbackEmail(payload.id!))
      case 'idea':
        return json(await ideaEmail(payload.id!))
      case 'redemption':
        return json(await redemptionEmail(payload.id!))
      case 'report':
        return json(await reportEmail(payload.id!))
      case 'digest_tick':
        return json(await digestTick())
      case 'digest_now':
        if (!fromAdmin) break
        return json(await digestEmail(7))
      case 'test': {
        if (!fromAdmin) break
        const s = await settings()
        const to = await emailsFor(['admin'], s.extra_recipients)
        return json({
          ...(await send('test', to, 'Test e-mail from TotalCare Organisation', layout('E-mail is working', p('This is a test. Submission, feedback and summary e-mails will arrive like this.'), s.app_url))),
          recipients: to,
          configured: Boolean(Deno.env.get('RESEND_API_KEY')),
        })
      }
    }
    return json({ error: 'Unknown type' }, 400)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
