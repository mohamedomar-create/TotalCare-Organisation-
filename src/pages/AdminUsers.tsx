import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { Profile, Role } from '../lib/types'

const ROLE_HELP: Record<Role, string> = {
  staff: 'Org chart, directory, own submissions',
  management: 'Also reads published anonymised reports',
  admin: 'Everything, including names on submissions',
}

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

  async function setRole(user: Profile, role: Role) {
    if (role === 'admin' && !confirm(`Make ${user.email} an admin? Admins can see names on all submissions.`)) return
    const { error } = await supabase.from('profiles').update({ role }).eq('id', user.id)
    setError(error?.message ?? null)
    await load()
  }

  return (
    <div className="page">
      <h1>Users & roles</h1>
      <p className="muted">People appear here after their first sign-in. Everyone can send {perPerson} survey{perPerson === 1 ? '' : 's'} (change this on the dashboard). Use <strong>+1</strong> to let one person send another.</p>
      {error && <p className="error">{error}</p>}
      <table>
        <thead><tr><th>Name</th><th>E-mail</th><th>Role</th><th>Surveys</th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.full_name || '—'}</td>
              <td>{u.email}</td>
              <td>
                <select value={u.role} disabled={u.id === me?.id} onChange={(e) => void setRole(u, e.target.value as Role)}>
                  {(Object.keys(ROLE_HELP) as Role[]).map((r) => (
                    <option key={r} value={r}>{r} — {ROLE_HELP[r]}</option>
                  ))}
                </select>
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
