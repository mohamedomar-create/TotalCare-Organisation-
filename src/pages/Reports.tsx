import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { buildDraftReport } from '../lib/report'
import type { Department, Report, Submission } from '../lib/types'

export default function Reports() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const isAdmin = profile?.role === 'admin'
  const [reports, setReports] = useState<Report[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        setError(error?.message ?? null)
        setReports((data ?? []) as Report[])
      })
  }, [])

  async function generate() {
    const [s, d] = await Promise.all([
      supabase.from('submissions').select('*').eq('status', 'submitted'),
      supabase.from('departments').select('*'),
    ])
    if (s.error || d.error) {
      setError(s.error?.message ?? d.error?.message ?? null)
      return
    }
    const draft = buildDraftReport(s.data as Submission[], d.data as Department[])
    const title = `Organisation feedback — ${new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`
    const { data, error } = await supabase.from('reports').insert({ title, ...draft }).select().single()
    if (error) setError(error.message)
    else navigate(`/reports/${data.id}`)
  }

  return (
    <div className="page">
      <h1>Reports for management</h1>
      {isAdmin && (
        <>
          <p className="muted">
            Generate a draft from all submitted responses. Names are never included. Read it carefully and edit out
            anything in the text that could identify someone, then publish it to management.
          </p>
          <button onClick={generate}>+ Generate draft report</button>
        </>
      )}
      {error && <p className="error">{error}</p>}
      <ul className="list">
        {reports.map((r) => (
          <li key={r.id} className="card">
            <Link to={`/reports/${r.id}`}>{r.title}</Link>
            <span className="muted">
              {' '}· {r.stats.total} responses · {r.published ? `published ${new Date(r.published_at!).toLocaleDateString()}` : 'draft (not visible to management)'}
            </span>
          </li>
        ))}
      </ul>
      {reports.length === 0 && <p className="muted">No reports yet.</p>}
    </div>
  )
}
