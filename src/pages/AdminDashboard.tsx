import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Download } from 'lucide-react'
import { useAdminData } from '../lib/useAdminData'
import { useDirectory } from '../lib/useDirectory'
import { enps, ratingAverages, tagCounts } from '../lib/analytics'
import { downloadCsv } from '../lib/csv'
import BarList from '../components/BarList'

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="card stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {hint && <span className="muted small">{hint}</span>}
    </div>
  )
}

export default function AdminDashboard() {
  const { submissions, reviews, feedback, profiles, loading, error } = useAdminData()
  const { departments } = useDirectory()
  const [dept, setDept] = useState('')

  const deptName = useMemo(() => new Map(departments.map((d) => [d.id, d.name])), [departments])
  const submitted = submissions.filter((s) => s.status === 'submitted')
  const filtered = submitted.filter((s) => !dept || s.department_id === dept)
  const drafts = submissions.filter((s) => s.status === 'draft').length
  const respondents = new Set(submitted.map((s) => s.author_id)).size
  const unread = submitted.filter((s) => (reviews.get(s.id)?.status ?? 'new') === 'new').length
  const newFeedback = feedback.filter((f) => f.status === 'new').length
  const score = enps(filtered)

  const byDept = tagCounts(submitted.map((s) => [(s.department_id && deptName.get(s.department_id)) || 'Not given']))

  if (loading) return <div className="page"><p className="muted">Loading…</p></div>

  return (
    <div className="page wide">
      <div className="row between">
        <h1>Admin dashboard</h1>
        <div className="row">
          <select value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Filter by department">
            <option value="">All departments</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <button className="secondary" onClick={() => downloadCsv(filtered, profiles, deptName)}><Download size={16} /> Export CSV</button>
        </div>
      </div>
      {error && <p className="error">{error}</p>}

      <div className="stat-grid">
        <Stat label="Submitted" value={filtered.length} hint={dept ? 'in this department' : `${drafts} drafts in progress`} />
        <Stat label="Response rate" value={profiles.length ? `${Math.round((respondents / profiles.length) * 100)}%` : '—'} hint={`${respondents} of ${profiles.length} signed-up staff`} />
        <Stat label="eNPS" value={score ? (score.score > 0 ? `+${score.score}` : score.score) : '—'} hint={score ? `${score.count} answers · −100 to +100` : 'No answers yet'} />
        <Link to="/admin/inbox" className="card stat stat-link">
          <span className="stat-label">Waiting for you</span>
          <span className="stat-value">{unread + newFeedback}</span>
          <span className="muted small">{unread} submissions · {newFeedback} feedback <ArrowRight size={13} /></span>
        </Link>
      </div>

      <div className="dash-grid">
        <section className="card">
          <h2>Pulse — average score (1–5)</h2>
          <BarList items={ratingAverages(filtered).map((r) => ({ label: r.label, value: r.average, detail: `${r.count} answers` }))} max={5} format={(v) => v.toFixed(1)} />
        </section>
        <section className="card">
          <h2>Top challenges</h2>
          <BarList items={tagCounts(filtered.map((s) => s.challenge_tags)).slice(0, 8).map((c) => ({ label: c.label, value: c.count }))} />
        </section>
        <section className="card">
          <h2>Responsibilities reported</h2>
          <BarList items={tagCounts(filtered.map((s) => s.responsibility_tags)).slice(0, 8).map((c) => ({ label: c.label, value: c.count }))} />
        </section>
        <section className="card">
          <h2>Responses by department</h2>
          <BarList items={byDept.map((c) => ({ label: c.label, value: c.count }))} />
        </section>
      </div>

      <section className="card">
        <div className="row between">
          <h2>Latest ideas</h2>
          <Link to="/admin/inbox" className="link">Open inbox <ArrowRight size={14} /></Link>
        </div>
        {filtered.flatMap((s) => [s.quick_win, ...(s.ideas ?? [])].filter((i) => i?.trim())).slice(0, 10).map((idea, i) => (
          <p key={i} className="quote">“{idea}”</p>
        ))}
        {filtered.every((s) => !s.quick_win && !(s.ideas ?? []).some((i) => i.trim())) && <p className="muted small">No ideas yet.</p>}
      </section>
    </div>
  )
}
