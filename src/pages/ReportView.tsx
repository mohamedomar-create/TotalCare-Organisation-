import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { Report } from '../lib/types'
import { OrgBoardView } from '../components/board/OrgBoardEditor'
import BarList from '../components/BarList'

export default function ReportView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('reports')
      .select('*')
      .eq('id', id!)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setReport(data as Report)
      })
  }, [id])

  async function save(patch: Partial<Report>) {
    const { data, error } = await supabase.from('reports').update(patch).eq('id', id!).select().single()
    if (error) setError(error.message)
    else {
      setReport(data as Report)
      setMessage('Saved')
    }
  }

  function removeStructure(index: number) {
    if (!report) return
    setReport({ ...report, structures: report.structures.filter((_, i) => i !== index) })
  }

  if (error) return <p className="error">{error}</p>
  if (!report) return <p>Loading…</p>

  const editable = isAdmin && !report.published

  return (
    <div className="page wide report">
      {editable ? (
        <input className="title-input" value={report.title} onChange={(e) => setReport({ ...report, title: e.target.value })} />
      ) : (
        <h1>{report.title}</h1>
      )}
      <p className="muted">
        {report.stats.total} responses ·{' '}
        {report.stats.byDepartment.map((d) => `${d.name}: ${d.count}`).join(' · ')}
      </p>

      {Boolean(report.stats.ratings?.length || report.stats.challenges?.length) && (
        <div className="dash-grid">
          {report.stats.ratings && (
            <section className="card">
              <h2>Pulse — average score (1–5)</h2>
              <BarList items={report.stats.ratings.map((r) => ({ label: r.label, value: r.average, detail: `${r.count} answers` }))} max={5} format={(v) => v.toFixed(1)} />
            </section>
          )}
          {report.stats.challenges && (
            <section className="card">
              <h2>Top challenges</h2>
              <BarList items={report.stats.challenges.map((c) => ({ label: c.label, value: c.count }))} />
              {report.stats.enps && <p className="muted small">eNPS: {report.stats.enps.score > 0 ? '+' : ''}{report.stats.enps.score} ({report.stats.enps.count} answers)</p>}
            </section>
          )}
        </div>
      )}

      {editable ? (
        <textarea className="report-text" rows={30} value={report.summary} onChange={(e) => setReport({ ...report, summary: e.target.value })} />
      ) : (
        <div className="card pre">{report.summary}</div>
      )}

      {report.structures.length > 0 && (
        <>
          <h2>Org charts proposed by staff ({report.structures.length})</h2>
          {report.structures.map((st, i) => (
            <div key={st.roles[0]?.id ?? i} className="card">
              <div className="row between">
                <strong>Proposal {i + 1}</strong>
                {editable && <button className="link danger" onClick={() => removeStructure(i)}>Remove from report</button>}
              </div>
              <OrgBoardView board={st} />
            </div>
          ))}
        </>
      )}

      {isAdmin && (
        <div className="row">
          {editable && (
            <>
              <button className="secondary" onClick={() => save({ title: report.title, summary: report.summary, structures: report.structures })}>Save draft</button>
              <button
                onClick={() =>
                  confirm('Publish to management? They will be able to read this report.') &&
                  void save({ title: report.title, summary: report.summary, structures: report.structures, published: true, published_at: new Date().toISOString() })
                }
              >Publish to management</button>
            </>
          )}
          {report.published && <button className="secondary" onClick={() => save({ published: false, published_at: null })}>Unpublish</button>}
          <button
            className="danger"
            onClick={async () => {
              if (!confirm('Delete this report?')) return
              const { error } = await supabase.from('reports').delete().eq('id', id!)
              if (error) setError(error.message)
              else navigate('/reports')
            }}
          >Delete</button>
          {message && <span className="muted">{message}</span>}
        </div>
      )}
    </div>
  )
}
