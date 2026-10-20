import { useEffect, useState } from 'react'
import { UserRound } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useDirectory } from '../lib/useDirectory'
import { levelFor, useMyPoints } from '../lib/community'
import { Avatar, PageHero } from '../components/ui'

interface ProfileDetails {
  full_name: string
  department_id: string | null
  job_title: string
  birthday: string | null
  joined_on: string | null
  show_birthday: boolean
}

export default function Profile() {
  const { session, refreshProfile } = useAuth()
  const { departments } = useDirectory()
  const { earned } = useMyPoints(session?.user.id)
  const [form, setForm] = useState<ProfileDetails | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('full_name, department_id, job_title, birthday, joined_on, show_birthday')
      .eq('id', session!.user.id)
      .single()
      .then(({ data }) => setForm(data as ProfileDetails))
  }, [session])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    const { error } = await supabase.from('profiles').update({ ...form, birthday: form.birthday || null, joined_on: form.joined_on || null }).eq('id', session!.user.id)
    setSaved(error ? error.message : 'Saved ✓')
    if (!error) await refreshProfile()
  }

  if (!form) return <div className="page"><p className="muted">Loading…</p></div>
  const level = levelFor(earned)
  const dept = departments.find((d) => d.id === form.department_id)

  return (
    <div className="page">
      <PageHero kicker="My profile" title={form.full_name || 'Your profile'} ar="ملفي" color={dept?.color} icon={<Avatar name={form.full_name || '?'} size={56} color="rgba(255,255,255,.25)" />}>
        <p className="hero-sub">{level.emoji} {level.name} · {earned} points earned{dept ? ` · ${dept.name}` : ''}</p>
      </PageHero>
      <form className="card" onSubmit={save}>
        <h2><UserRound size={18} /> About you</h2>
        <p className="muted small">This helps colleagues find you, puts you in the right sector, and lets us celebrate your birthday and work anniversaries.</p>
        <label>Full name<input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></label>
        <div className="two-fields">
          <label>
            Sector
            <select value={form.department_id ?? ''} onChange={(e) => setForm({ ...form, department_id: e.target.value || null })}>
              <option value="">Choose…</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
          <label>Job title<input value={form.job_title} placeholder="e.g. Service Engineer" onChange={(e) => setForm({ ...form, job_title: e.target.value })} /></label>
        </div>
        <div className="two-fields">
          <label>Birthday <span className="muted">(optional)</span><input type="date" value={form.birthday ?? ''} onChange={(e) => setForm({ ...form, birthday: e.target.value })} /></label>
          <label>Joined TotalCare on <span className="muted">(optional)</span><input type="date" value={form.joined_on ?? ''} onChange={(e) => setForm({ ...form, joined_on: e.target.value })} /></label>
        </div>
        <label className="inline">
          <input type="checkbox" checked={form.show_birthday} onChange={(e) => setForm({ ...form, show_birthday: e.target.checked })} />
          Show my birthday (day and month only, never the year) on the home page
        </label>
        <div className="row">
          <button type="submit">Save</button>
          {saved && <span className={saved.startsWith('Saved') ? 'success-text' : 'error'}>{saved}</span>}
        </div>
      </form>
    </div>
  )
}
