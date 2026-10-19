import { Fragment, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useDirectory } from '../lib/useDirectory'
import type { Profile, Submission } from '../lib/types'
import StructureEditor from '../components/StructureEditor'

export default function AdminSubmissions() {
  const { departments } = useDirectory()
  const [subs, setSubs] = useState<Submission[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [showDrafts, setShowDrafts] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      supabase.from('submissions').select('*').order('submitted_at', { ascending: false, nullsFirst: false }),
      supabase.from('profiles').select('*'),
    ]).then(([s, p]) => {
      setError(s.error?.message ?? p.error?.message ?? null)
      setSubs((s.data ?? []) as Submission[])
      setProfiles((p.data ?? []) as Profile[])
    })
  }, [])

  const author = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles])
  const deptName = useMemo(() => new Map(departments.map((d) => [d.id, d.name])), [departments])
  const visible = subs.filter((s) => showDrafts || s.status === 'submitted')

  return (
    <div className="page wide">
      <h1>All submissions</h1>
      <p className="muted">
        Only you (admin) can see names here. Staff were told their name is visible to the admin only. Please keep it that
        way — don't share names or quote identifying details to management.
      </p>
      <label className="inline">
        <input type="checkbox" checked={showDrafts} onChange={(e) => setShowDrafts(e.target.checked)} /> Include unfinished drafts
      </label>
      {error && <p className="error">{error}</p>}
      <table>
        <thead>
          <tr><th>Name</th><th>Department</th><th>Status</th><th>Date</th><th /></tr>
        </thead>
        <tbody>
          {visible.map((s) => {
            const a = author.get(s.author_id)
            return (
              <Fragment key={s.id}>
                <tr>
                  <td>{a?.full_name || a?.email}</td>
                  <td>{(s.department_id && deptName.get(s.department_id)) || '—'}</td>
                  <td>{s.status}</td>
                  <td>{new Date(s.submitted_at ?? s.updated_at).toLocaleDateString()}</td>
                  <td><button className="link" onClick={() => setOpenId(openId === s.id ? null : s.id)}>{openId === s.id ? 'Hide' : 'View'}</button></td>
                </tr>
                {openId === s.id && (
                  <tr>
                    <td colSpan={5}>
                      <StructureEditor key={s.id} value={s.structure} readOnly height={360} />
                      <h3>Responsibilities</h3><p className="pre">{s.responsibilities || '—'}</p>
                      <h3>Challenges</h3><p className="pre">{s.challenges || '—'}</p>
                      <h3>Suggestions</h3><p className="pre">{s.suggestions || '—'}</p>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
      {visible.length === 0 && <p className="muted">No submissions yet.</p>}
    </div>
  )
}
