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

  async function load() {
    const { data, error } = await supabase.from('profiles').select('*').order('email')
    setError(error?.message ?? null)
    setUsers((data ?? []) as Profile[])
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
      <p className="muted">People appear here after their first sign-in.</p>
      {error && <p className="error">{error}</p>}
      <table>
        <thead><tr><th>Name</th><th>E-mail</th><th>Role</th></tr></thead>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
