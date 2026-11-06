import { useCallback, useEffect, useMemo, useState } from 'react'
import { Ban, CalendarPlus, Copy, Link2, MessageCircle, Send, UserPlus, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useDirectory } from '../lib/useDirectory'
import type { Role } from '../lib/types'
import { newInviteCode, whatsappNumber } from '../lib/invites'

interface Invitation {
  id: string
  code: string
  full_name: string
  email: string | null
  phone: string
  department_id: string | null
  role: Role
  max_uses: number
  uses: number
  expires_at: string
  revoked: boolean
  used_by: string | null
  last_used_at: string | null
  created_at: string
}

function status(i: Invitation) {
  if (i.revoked) return { key: 'revoked', label: 'Cancelled', tone: 'rose' }
  if (i.uses >= i.max_uses) return { key: 'joined', label: i.max_uses > 1 ? 'Full' : 'Joined', tone: 'green' }
  if (new Date(i.expires_at) < new Date()) return { key: 'expired', label: 'Expired', tone: 'slate' }
  return { key: 'pending', label: i.max_uses > 1 ? `${i.uses} of ${i.max_uses} joined` : 'Waiting', tone: 'amber' }
}

export default function AdminInvitations() {
  const { departments } = useDirectory()
  const [items, setItems] = useState<Invitation[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'joined'>('all')
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', department_id: '', role: 'staff' as Role })
  const [bulk, setBulk] = useState('')
  const [bulkDept, setBulkDept] = useState('')
  const [team, setTeam] = useState({ department_id: '', max_uses: 30, days: 14 })
  const [copied, setCopied] = useState('')
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const dept = useMemo(() => new Map(departments.map((d) => [d.id, d.name])), [departments])

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('invitations').select('*').order('created_at', { ascending: false })
    setError(error ? (error.message.includes('invitations') ? 'Run supabase/migrations/0007_invitations.sql first (see the README).' : error.message) : null)
    setItems((data ?? []) as Invitation[])
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  const link = (i: Invitation) => `${origin}/join/${i.code}`
  const message = (i: Invitation) =>
    [
      `${i.full_name ? `أهلاً ${i.full_name} 👋` : 'أهلاً 👋'} اتفضل ادخل على استبيان TotalCare من اللينك ده — بياخد حوالي ٨ دقايق وتقدر تجاوب من غير اسمك.`,
      `${i.full_name ? `Hi ${i.full_name}, ` : 'Hi, '}here is your invitation to the TotalCare survey (about 8 minutes, you can answer anonymously):`,
      link(i),
      i.max_uses === 1 ? 'هذا اللينك خاص بيك، متبعتوش لحد. · This link is personal — please don’t share it.' : '',
    ].filter(Boolean).join('\n\n')

  async function create(rows: Partial<Invitation>[], done: string) {
    setError(null)
    const { error } = await supabase.from('invitations').insert(rows.map((r) => ({ code: newInviteCode(), ...r })))
    if (error) return setError(/invitations_email_open|duplicate/.test(error.message) ? 'This e-mail already has an open invitation.' : error.message)
    setNotice(done)
    await load()
  }

  async function addOne(e: React.FormEvent) {
    e.preventDefault()
    if (form.full_name.trim().length < 3) return setError('Write the person’s full name.')
    await create([{ full_name: form.full_name.trim(), phone: form.phone.trim(), email: form.email.trim().toLowerCase() || null, department_id: form.department_id || null, role: form.role }], `Invitation for ${form.full_name} created — send it from the list below.`)
    setForm({ full_name: '', phone: '', email: '', department_id: form.department_id, role: 'staff' })
  }

  async function addMany() {
    const rows = bulk.split('\n').map((l) => l.split(/[,\t;]/).map((x) => x.trim())).filter((p) => p[0]?.length >= 3)
    if (!rows.length) return setError('Write one person per line: name, phone')
    await create(rows.map(([full_name, phone = '']) => ({ full_name, phone, department_id: bulkDept || null })), `${rows.length} invitations created.`)
    setBulk('')
  }

  async function addTeam() {
    await create([{ full_name: '', department_id: team.department_id || null, max_uses: team.max_uses, expires_at: new Date(Date.now() + team.days * 86400000).toISOString() }], 'Team link created. Share it in the team’s WhatsApp group.')
  }

  async function update(i: Invitation, patch: Partial<Invitation>) {
    const { error } = await supabase.from('invitations').update(patch).eq('id', i.id)
    if (error) setError(error.message)
    await load()
  }

  function copy(text: string, key: string) {
    void navigator.clipboard?.writeText(text)
    setCopied(key)
  }

  const shown = items.filter((i) => filter === 'all' || status(i).key === filter)
  const pending = items.filter((i) => status(i).key === 'pending').length
  const joined = items.reduce((a, i) => a + i.uses, 0)

  return (
    <div className="page wide">
      <h1>Invitations <span className="ar-title" lang="ar">الدعوات</span></h1>
      <p className="muted">Invite anyone — drivers, technicians, warehouse staff, colleagues with a personal e-mail. They open a personal link on their phone and join with no e-mail or password. Company e-mails (@totalcareegypt.com) don’t need an invitation.</p>
      {error && <p className="error">{error}</p>}
      {notice && <p className="notice" onClick={() => setNotice(null)}>{notice}</p>}

      <div className="kpi-grid">
        <div className="kpi"><span className="kpi-head"><Send size={16} />Invitations</span><span className="kpi-value">{items.length}</span></div>
        <div className="kpi"><span className="kpi-head"><Users size={16} />People joined</span><span className="kpi-value">{joined}</span></div>
        <div className="kpi"><span className="kpi-head"><CalendarPlus size={16} />Waiting</span><span className="kpi-value">{pending}</span><span className="kpi-hint">send a reminder on WhatsApp</span></div>
      </div>

      <div className="two-col">
        <form className="card" onSubmit={addOne}>
          <h2><UserPlus size={18} /> Invite one person</h2>
          <label>Full name<input dir="auto" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="e.g. Hassan Mahmoud" /></label>
          <div className="two-fields">
            <label>Mobile (WhatsApp)<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="010 1234 5678" /></label>
            <label>E-mail <span className="muted">(optional, any domain)</span><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@gmail.com" /></label>
          </div>
          <div className="two-fields">
            <label>Department
              <select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                <option value="">—</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </label>
            <label>Role
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                <option value="staff">Staff</option>
                <option value="management">Management</option>
                <option value="admin">Admin</option>
              </select>
            </label>
          </div>
          <button type="submit"><UserPlus size={15} /> Create invitation</button>
        </form>

        <div className="stack-cards">
          <section className="card">
            <h2><Users size={18} /> Invite many at once</h2>
            <textarea rows={4} dir="auto" value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder={'One per line: name, mobile\nHassan Mahmoud, 01012345678\nمحمد سعيد, 01198765432'} />
            <div className="row">
              <select value={bulkDept} onChange={(e) => setBulkDept(e.target.value)} style={{ width: 'auto' }}>
                <option value="">Department (optional)</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <button type="button" className="secondary" onClick={addMany}>Create all</button>
            </div>
          </section>
          <section className="card">
            <h2><Link2 size={18} /> Team link</h2>
            <p className="muted small">One link for a WhatsApp group: each person types their own name. It stops after the number of people you set, and only creates staff members. Personal links are safer — use this when you don’t have everyone’s number.</p>
            <div className="row">
              <select value={team.department_id} onChange={(e) => setTeam({ ...team, department_id: e.target.value })} style={{ width: 'auto' }}>
                <option value="">Any department</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <label className="inline-check">Up to <input type="number" min={2} max={500} value={team.max_uses} onChange={(e) => setTeam({ ...team, max_uses: Math.max(2, Number(e.target.value)) })} style={{ width: 80 }} /> people</label>
              <label className="inline-check">for <input type="number" min={1} max={90} value={team.days} onChange={(e) => setTeam({ ...team, days: Math.max(1, Number(e.target.value)) })} style={{ width: 70 }} /> days</label>
              <button type="button" className="secondary" onClick={addTeam}>Create</button>
            </div>
          </section>
        </div>
      </div>

      <section className="card">
        <div className="row between">
          <h2>All invitations</h2>
          <div className="segmented">
            {(['all', 'pending', 'joined'] as const).map((f) => <button key={f} type="button" className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>{f === 'all' ? 'All' : f === 'pending' ? 'Waiting' : 'Joined'}</button>)}
          </div>
        </div>
        <table className="coverage-table invite-table">
          <thead><tr><th>Who</th><th>Department</th><th>Status</th><th>Send</th><th /></tr></thead>
          <tbody>
            {shown.map((i) => {
              const st = status(i)
              const wa = whatsappNumber(i.phone)
              return (
                <tr key={i.id}>
                  <td>
                    <b dir="auto">{i.max_uses > 1 ? `Team link (${i.max_uses} people)` : i.full_name}</b>
                    <div className="muted small">{[i.phone, i.email, i.role !== 'staff' ? i.role : ''].filter(Boolean).join(' · ')}</div>
                    <div className="mono tiny muted">{i.code}</div>
                  </td>
                  <td>{i.department_id ? dept.get(i.department_id) : '—'}</td>
                  <td><span className={`pill tone-${st.tone}`}>{st.label}</span><div className="muted tiny">until {new Date(i.expires_at).toLocaleDateString()}</div></td>
                  <td className="nowrap">
                    {st.key === 'pending' && (
                      <>
                        <a className="button small-btn" href={`https://wa.me/${wa}?text=${encodeURIComponent(message(i))}`} target="_blank" rel="noreferrer"><MessageCircle size={14} /> WhatsApp</a>{' '}
                        <button type="button" className="secondary small-btn" onClick={() => copy(message(i), i.id)}><Copy size={14} /> {copied === i.id ? 'Copied' : 'Copy'}</button>
                      </>
                    )}
                  </td>
                  <td className="nowrap">
                    {(st.key === 'pending' || st.key === 'expired') && <button type="button" className="link small" onClick={() => void update(i, { expires_at: new Date(Date.now() + 30 * 86400000).toISOString() })}><CalendarPlus size={13} /> +30 days</button>}{' '}
                    {st.key !== 'revoked' && st.key !== 'joined' && <button type="button" className="link danger small" onClick={() => confirm('Cancel this invitation? The link will stop working.') && void update(i, { revoked: true })}><Ban size={13} /> Cancel</button>}
                  </td>
                </tr>
              )
            })}
            {shown.length === 0 && <tr><td colSpan={5} className="muted">No invitations yet.</td></tr>}
          </tbody>
        </table>
        <p className="muted small">Lost phone or cleared browser? Cancel the old invitation and create a new one for the same person.</p>
      </section>
    </div>
  )
}
