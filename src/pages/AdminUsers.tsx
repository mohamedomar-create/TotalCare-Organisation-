import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { Profile, Role } from '../lib/types'
import { ROLE_HELP, ROLE_LABEL, isOwner } from '../lib/roles'
import AddSurveyAdmin from '../components/AddSurveyAdmin'

export default function AdminUsers() {
  const { profile: me } = useAuth()
  const [users, setUsers] = useState<Profile[]>([])
  const [error, setError] = useState<string | null>(null)
  const [perPerson, setPerPerson] = useState(1)
  const [extra, setExtra] = useState<Map<string, number>>(new Map())
  const [used, setUsed] = useState<Map<string, number>>(new Map())

  async function load() {
    const [p, a, s, sub] = await Promise.all([
      supabase.from('profiles').select('*').order('email'),
      supabase.from('submission_allowances').select('user_id, extra'),
      supabase.from('app_settings').select('submissions_per_person').eq('id', 1).maybeSingle(),
      supabase.from('submissions').select('author_id'),
    ])
    setError(p.error?.message ?? null)
    setUsers((p.data ?? []) as Profile[])
    setExtra(new Map(((a.data ?? []) as { user_id: string; extra: number }[]).map((r) => [r.user_id, r.extra])))
    setPerPerson((s.data as { submissions_per_person: number } | null)?.submissions_per_person ?? 1)
    const counts = new Map<string, number>()
    for (const r of (sub.data ?? []) as { author_id: string }[]) counts.set(r.author_id, (counts.get(r.author_id) ?? 0) + 1)
    setUsed(counts)
  }

  // Lets one person send one more survey (or takes that back).
  async function changeExtra(user: Profile, delta: number) {
    const next = Math.max(0, (extra.get(user.id) ?? 0) + delta)
    const { error } = await supabase.from('submission_allowances').upsert({ user_id: user.id, extra: next })
    setError(error?.message ?? null)
    await load()
  }

  useEffect(() => {
    void load()
  }, [])

  // Names appear in the survey's "best manager / best employee" lists, so keep them as people know them.
  async function rename(user: Profile, full_name: string) {
    const { error } = await supabase.from('profiles').update({ full_name }).eq('id', user.id)
    setError(error?.message ?? null)
    await load()
  }

  async function setRole(user: Profile, role: Role) {
    if (role === 'admin' && !confirm(`Make ${user.full_name || user.email} a super admin? They will see all answers and names.`)) return
    if (role === 'distributor' && !confirm(`Make ${user.full_name || user.email} a survey admin? They can create invitation links and see who hasn’t answered, but no answers.`)) return
    const { error } = await supabase.from('profiles').update({ role }).eq('id', user.id)
    setError(error?.message ?? null)
    await load()
  }

  return (
    <div className="page">
      <h1>Users & roles <span className="ar-title" lang="ar">المستخدمين والصلاحيات</span></h1>
      <div className="role-guide">
        {(['admin', 'distributor', 'management', 'staff'] as Role[]).map((r) => (
          <div key={r} className={`card role-card role-${r}`}><b>{ROLE_LABEL[r]}</b><p className="muted small">{ROLE_HELP[r]}</p></div>
        ))}
      </div>
      <AddSurveyAdmin users={users} onDone={() => void load()} />
      <p className="muted small">Someone already in the list below? Change their role there. Click a name to correct it — names appear in the survey’s “best manager / best employee” lists.</p>
      <p className="muted">People appear here after their first sign-in. Invite people without a company e-mail on the <Link to="/admin/invitations">Invitations</Link> page. Everyone can send {perPerson} survey{perPerson === 1 ? '' : 's'} (change this on the dashboard). Use <strong>+1</strong> to let one person send another.</p>
      {error && <p className="error">{error}</p>}
      <table>
        <thead><tr><th>Name</th><th>E-mail</th><th>Role</th><th>Surveys</th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>
                <input className="name-edit" dir="auto" defaultValue={u.full_name} aria-label="Full name" placeholder="Full name"
                  onBlur={(e) => { const v = e.target.value.trim(); if (v !== (u.full_name ?? '') && v.length >= 2) void rename(u, v) }}
                  onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} />
                {u.active === false && <span className="pill tone-amber">not joined yet</span>}
              </td>
              <td>{u.email.endsWith('@invite.local') ? <span className="muted">{u.phone || 'joined by invitation link'}</span> : u.email}</td>
              <td>
                {isOwner(u.email) ? (
                  <span className="pill tone-violet">Super admin · owner</span>
                ) : (
                  <select value={u.role} disabled={u.id === me?.id} onChange={(e) => void setRole(u, e.target.value as Role)}>
                    {(['staff', 'management', 'distributor', 'admin'] as Role[])
                      // Only the owner can make another super admin (the database checks this too).
                      .filter((r) => r !== 'admin' || u.role === 'admin' || isOwner(me?.email))
                      .map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </select>
                )}
              </td>
              <td className="nowrap">
                <span className={(used.get(u.id) ?? 0) >= perPerson + (extra.get(u.id) ?? 0) ? 'pill status-actioned' : 'pill'}>
                  {used.get(u.id) ?? 0} of {perPerson + (extra.get(u.id) ?? 0)}
                </span>{' '}
                <button type="button" className="secondary small-btn" title="Allow one more survey" onClick={() => void changeExtra(u, 1)}>+1</button>{' '}
                {(extra.get(u.id) ?? 0) > 0 && <button type="button" className="link small" title="Take back the extra survey" onClick={() => void changeExtra(u, -1)}>−1</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
