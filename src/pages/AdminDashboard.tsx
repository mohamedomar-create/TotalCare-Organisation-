import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  HeartPulse,
  Inbox,
  Lightbulb,
  Printer,
  RotateCcw,
  Sparkles,
  Users,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAdminData } from '../lib/useAdminData'
import { useDirectory } from '../lib/useDirectory'
import { RATING_DIMENSIONS } from '../lib/survey'
import {
  BAND_LABEL,
  bandFor,
  enps,
  enpsSplit,
  healthIndex,
  overallAverage,
  ratingAverages,
  tagCounts,
  weeklyCounts,
  type Band,
} from '../lib/analytics'
import { downloadCsv } from '../lib/csv'
import { IDEA_STATUS, type Idea } from '../lib/community'
import type { Submission } from '../lib/types'
import { CountUp } from '../components/ui'

const PERIODS = [
  { key: 'all', label: 'All time', days: 0 },
  { key: '90', label: '90 days', days: 90 },
  { key: '30', label: '30 days', days: 30 },
]
const SMALL_GROUP = 3 // departments with fewer answers are flagged, so no one is singled out

// Diverging scale around the neutral 3: red = poor, grey = neutral, blue = good.
function cellColor(v: number) {
  if (v <= 1.75) return { bg: '#b42a2a', fg: '#fff' }
  if (v <= 2.5) return { bg: '#e34948', fg: '#fff' }
  if (v < 2.9) return { bg: '#f4b2b1', fg: '#0f172a' }
  if (v <= 3.1) return { bg: '#f0efec', fg: '#0f172a' }
  if (v < 3.5) return { bg: '#b7d3f6', fg: '#0f172a' }
  if (v <= 4.25) return { bg: '#3987e5', fg: '#fff' }
  return { bg: '#1c5cab', fg: '#fff' }
}

function BandTag({ band }: { band: Band }) {
  const Icon = band === 'good' ? CheckCircle2 : band === 'watch' ? AlertTriangle : AlertOctagon
  return <span className={`band band-${band}`}><Icon size={13} /> {BAND_LABEL[band]}</span>
}

function Kpi({ icon, label, value, suffix, hint, children, to }: {
  icon: React.ReactNode
  label: string
  value: number | null
  suffix?: string
  hint?: React.ReactNode
  children?: React.ReactNode
  to?: string
}) {
  const body = (
    <>
      <span className="kpi-head">{icon}{label}</span>
      <span className="kpi-value">{value === null ? '—' : <><CountUp value={value} />{suffix}</>}</span>
      {children}
      {hint && <span className="kpi-hint">{hint}</span>}
    </>
  )
  return to ? <Link to={to} className="kpi plain">{body}</Link> : <div className="kpi">{body}</div>
}

export default function AdminDashboard() {
  const { submissions, reviews, feedback, profiles, loading, error, reload } = useAdminData()
  const { departments } = useDirectory()
  const [dept, setDept] = useState('')
  const [period, setPeriod] = useState('all')
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [kudosMonth, setKudosMonth] = useState(0)
  const [perPerson, setPerPerson] = useState(1)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  const loadExtra = useCallback(async () => {
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const [i, k, s] = await Promise.all([
      supabase.from('ideas').select('*'),
      supabase.from('kudos').select('id', { count: 'exact', head: true }).gte('created_at', monthStart.toISOString()),
      supabase.from('app_settings').select('submissions_per_person').eq('id', 1).maybeSingle(),
    ])
    setIdeas((i.data ?? []) as Idea[])
    setKudosMonth(k.count ?? 0)
    setPerPerson((s.data as { submissions_per_person: number } | null)?.submissions_per_person ?? 1)
  }, [])
  useEffect(() => {
    void loadExtra()
  }, [loadExtra])

  const deptName = useMemo(() => new Map(departments.map((d) => [d.id, d.name])), [departments])
  const sectors = departments.filter((d) => d.name !== 'Management')

  const since = PERIODS.find((p) => p.key === period)!.days
  const cutoff = since ? Date.now() - since * 86400000 : 0
  const submitted = submissions.filter((s) => s.status === 'submitted' && (!cutoff || (s.submitted_at && new Date(s.submitted_at).getTime() >= cutoff)))
  const filtered = submitted.filter((s) => !dept || s.department_id === dept)
  const drafts = submissions.filter((s) => s.status === 'draft').length

  const staffCount = dept ? profiles.filter((p) => p.department_id === dept).length : profiles.length
  const respondents = new Set(filtered.map((s) => s.author_id)).size
  const participation = staffCount ? Math.round((respondents / staffCount) * 100) : null
  const avg = overallAverage(filtered)
  const health = healthIndex(avg)
  const score = enps(filtered)
  const split = enpsSplit(filtered)
  const dims = ratingAverages(filtered).filter((d) => d.count > 0)
  const sortedDims = [...dims].sort((a, b) => b.average - a.average)
  const problems = tagCounts(filtered.map((s) => s.challenge_tags)).slice(0, 8)
  const waiting = submitted.filter((s) => (reviews.get(s.id)?.status ?? 'new') === 'new').length + feedback.filter((f) => f.status === 'new').length
  const weeks = weeklyCounts(submitted.filter((s) => !dept || s.department_id === dept))
  const weekMax = Math.max(1, ...weeks.map((w) => w.count))
  const liveIdeas = ideas.filter((i) => !i.hidden)
  const doneIdeas = liveIdeas.filter((i) => i.status === 'done').length

  // Department × area matrix (always across all departments, so it can be compared).
  const matrix = sectors.map((d) => {
    const rows = submitted.filter((s) => s.department_id === d.id)
    const cells = RATING_DIMENSIONS.map((dim) => {
      const values = rows.map((s) => s.ratings?.[dim.key]).filter((v): v is number => typeof v === 'number')
      return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null
    })
    return { dept: d, n: rows.length, avg: overallAverage(rows), cells, staff: profiles.filter((p) => p.department_id === d.id).length }
  })

  // Plain-language findings for the management summary.
  const insights: { tone: Band; text: string }[] = []
  if (filtered.length) {
    const best = sortedDims[0]
    const worst = sortedDims[sortedDims.length - 1]
    if (best) insights.push({ tone: bandFor(best.average), text: `Strongest area: **${best.label}** (${best.average.toFixed(1)} / 5).` })
    if (worst && worst !== best) insights.push({ tone: bandFor(worst.average), text: `Weakest area: **${worst.label}** (${worst.average.toFixed(1)} / 5) — the first place to act.` })
    if (problems[0]) insights.push({ tone: 'attention', text: `Top problem: **${problems[0].label}**, raised by ${Math.round((problems[0].count / filtered.length) * 100)}% of people.` })
    const ranked = matrix.filter((m) => m.avg !== null && m.n >= SMALL_GROUP).sort((a, b) => a.avg! - b.avg!)
    if (ranked.length >= 2) insights.push({ tone: bandFor(ranked[0].avg!), text: `Department needing most support: **${ranked[0].dept.name}** (${ranked[0].avg!.toFixed(1)} / 5).` })
    if (score) insights.push({ tone: score.score >= 10 ? 'good' : score.score >= -10 ? 'watch' : 'attention', text: `eNPS is **${score.score > 0 ? '+' : ''}${score.score}**: ${split.promoters} would recommend TotalCare, ${split.detractors} would not.` })
  }
  const silent = matrix.filter((m) => m.n === 0).map((m) => m.dept.name)
  if (silent.length && !dept) insights.push({ tone: 'watch', text: `No answers yet from **${silent.join(', ')}** — ask their managers to remind the team.` })
  if (participation !== null && participation < 50) insights.push({ tone: 'watch', text: `Only **${participation}%** have answered so far. Aim for at least 70% before drawing conclusions.` })

  async function savePerPerson(n: number) {
    const value = Math.max(1, Math.min(50, n))
    const { error } = await supabase.from('app_settings').update({ submissions_per_person: value, updated_at: new Date().toISOString() }).eq('id', 1)
    setNotice(error ? { ok: false, text: error.message } : { ok: true, text: `Everyone can now send ${value} survey${value === 1 ? '' : 's'}.` })
    void loadExtra()
  }

  async function resetAll() {
    const typed = prompt('This permanently deletes ALL surveys, feedback, ideas, kudos, points, reward requests, reports and the e-mail log.\nPeople, departments, the directory and rewards stay.\n\nType RESET to confirm:')
    if (typed === null) return
    const { error } = await supabase.rpc('admin_reset_data', { p_confirm: typed.trim() })
    setNotice(error ? { ok: false, text: error.message.includes('admin_reset_data') ? 'The reset function is not installed yet — see the README (one SQL step).' : error.message } : { ok: true, text: 'All data was cleared. A fresh start!' })
    await reload()
    void loadExtra()
  }

  if (loading) return <div className="page"><p className="muted">Loading…</p></div>

  const total = split.total || 1
  return (
    <div className="page wide exec">
      <section className="exec-head">
        <div className="grow">
          <p className="hero-kicker dark">Executive dashboard · {new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <h1>How TotalCare is doing</h1>
          <p className="muted">{dept ? deptName.get(dept) : 'Whole company'} · {filtered.length} survey{filtered.length === 1 ? '' : 's'} · {drafts} in progress</p>
        </div>
        <div className="exec-filters no-print">
          <div className="segmented">
            {PERIODS.map((p) => <button key={p.key} type="button" className={period === p.key ? 'active' : ''} onClick={() => setPeriod(p.key)}>{p.label}</button>)}
          </div>
          <select value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Department">
            <option value="">All departments</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <button type="button" className="secondary" onClick={() => downloadCsv(filtered, profiles, deptName)}><Download size={16} /> CSV</button>
          <button type="button" className="secondary" onClick={() => window.print()}><Printer size={16} /> Print / PDF</button>
        </div>
      </section>
      {error && <p className="error">{error}</p>}
      {notice && <p className={notice.ok ? 'success-text' : 'error'}>{notice.text}</p>}

      <div className="kpi-grid">
        <Kpi icon={<Users size={16} />} label="Participation" value={participation} suffix="%" hint={`${respondents} of ${staffCount} signed-up staff`}>
          <div className="meter"><span style={{ width: `${participation ?? 0}%` }} /></div>
        </Kpi>
        <Kpi icon={<HeartPulse size={16} />} label="Health index" value={health} suffix=" / 100" hint={avg !== null ? <BandTag band={bandFor(avg)} /> : 'No answers yet'}>
          <div className="meter"><span style={{ width: `${health ?? 0}%` }} /></div>
        </Kpi>
        <Kpi icon={<Sparkles size={16} />} label="eNPS" value={score?.score ?? null} hint={score ? `${score.count} answers · from −100 to +100` : 'No answers yet'}>
          <div className="enps-scale" aria-hidden="true"><span style={{ left: `${score ? (score.score + 100) / 2 : 50}%` }} /></div>
        </Kpi>
        <Kpi icon={<Inbox size={16} />} label="Waiting for you" value={waiting} to="/admin/inbox" hint={<>Unread surveys and feedback <ArrowRight size={12} /></>} />
        <Kpi icon={<Lightbulb size={16} />} label="Ideas" value={liveIdeas.length} to="/ideas" hint={`${doneIdeas} put into action · ${kudosMonth} thank-yous this month`} />
      </div>

      <div className="exec-grid">
        <section className="card insights">
          <h2>Key findings</h2>
          {insights.length === 0 ? (
            <p className="muted">Findings appear here as soon as the first surveys arrive.</p>
          ) : (
            <ul>
              {insights.map((i, n) => (
                <li key={n} className={`rise tone-${i.tone}`} style={{ animationDelay: `${n * 70}ms` }}>
                  <BandTag band={i.tone} />
                  <span>{i.text.split('**').map((part, k) => (k % 2 ? <strong key={k}>{part}</strong> : part))}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2>Would people recommend TotalCare?</h2>
          {split.total === 0 ? <p className="muted small">No answers yet.</p> : (
            <>
              <div className="stack-bar" role="img" aria-label={`${split.detractors} would not, ${split.passives} neutral, ${split.promoters} would recommend`}>
                {[['det', split.detractors, 'Would not (0–6)'], ['pas', split.passives, 'Neutral (7–8)'], ['pro', split.promoters, 'Would recommend (9–10)']].map(([k, n, label]) =>
                  Number(n) > 0 ? <span key={k as string} className={`seg seg-${k}`} style={{ flexGrow: Number(n) }} data-tip={`${label}: ${n} (${Math.round((Number(n) / total) * 100)}%)`}>{Math.round((Number(n) / total) * 100)}%</span> : null,
                )}
              </div>
              <ul className="legend">
                <li><i className="seg-det" /> Would not · {split.detractors}</li>
                <li><i className="seg-pas" /> Neutral · {split.passives}</li>
                <li><i className="seg-pro" /> Would recommend · {split.promoters}</li>
              </ul>
            </>
          )}
          <h3 className="mt">Surveys per week</h3>
          <div className="columns" role="img" aria-label="Surveys sent per week, last 8 weeks">
            {weeks.map((w) => (
              <div key={w.label} className="col" data-tip={`Week of ${w.label}: ${w.count}`}>
                <span className="col-bar" style={{ height: `${(w.count / weekMax) * 100}%` }} />
                <small>{w.label}</small>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card">
        <div className="row between">
          <h2>Health by area</h2>
          <span className="muted small">Average answer, 1 (No) to 5 (Yes)</span>
        </div>
        {dims.length === 0 ? <p className="muted small">No answers yet.</p> : (
          <ul className="area-list">
            {sortedDims.map((d) => (
              <li key={d.key} data-tip={`${d.label}: ${d.average.toFixed(1)} from ${d.count} answers`}>
                <span className="area-label">{d.label}</span>
                <span className="area-track"><span className="area-fill" style={{ width: `${((d.average - 1) / 4) * 100}%` }} /><i className="area-mid" /></span>
                <b>{d.average.toFixed(1)}</b>
                <BandTag band={bandFor(d.average)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <div className="row between">
          <h2>Department heat map</h2>
          <div className="heat-legend" aria-hidden="true">
            <span>Poor</span>{[1.5, 2.3, 2.7, 3, 3.3, 4, 4.6].map((v) => <i key={v} style={{ background: cellColor(v).bg }} />)}<span>Good</span>
          </div>
        </div>
        <div className="heat-scroll">
          <table className="heat">
            <thead>
              <tr>
                <th>Department</th>
                {RATING_DIMENSIONS.map((d) => <th key={d.key}>{d.label}</th>)}
                <th>Overall</th>
                <th>Answers</th>
              </tr>
            </thead>
            <tbody>
              {matrix.map((m) => (
                <tr key={m.dept.id} className={m.n > 0 && m.n < SMALL_GROUP ? 'small-group' : ''}>
                  <th><i className="dot" style={{ background: m.dept.color }} /> {m.dept.name}</th>
                  {m.cells.map((v, i) => {
                    if (v === null) return <td key={i} className="empty">–</td>
                    const c = cellColor(v)
                    return <td key={i} style={{ background: c.bg, color: c.fg }} data-tip={`${m.dept.name} · ${RATING_DIMENSIONS[i].label}: ${v.toFixed(1)}`}>{v.toFixed(1)}</td>
                  })}
                  <td className="overall">{m.avg === null ? '–' : m.avg.toFixed(1)}</td>
                  <td className="muted">{m.n}{m.staff ? ` / ${m.staff}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">Rows with fewer than {SMALL_GROUP} answers are faded: too few to be reliable, and they should not be shared with management by name.</p>
      </section>

      <div className="exec-grid">
        <section className="card">
          <h2>Biggest problems</h2>
          {problems.length === 0 ? <p className="muted small">No answers yet.</p> : (
            <ul className="area-list problems">
              {problems.map((p, i) => {
                const pct = Math.round((p.count / Math.max(1, filtered.length)) * 100)
                return (
                  <li key={p.label} data-tip={`${p.count} of ${filtered.length} people`}>
                    <span className="rank-num">{i + 1}</span>
                    <span className="area-label">{p.label}</span>
                    <span className="area-track"><span className="area-fill prob" style={{ width: `${pct}%` }} /></span>
                    <b>{pct}%</b>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="row between"><h2>Ideas pipeline</h2><Link to="/ideas" className="link small">Open board <ArrowRight size={13} /></Link></div>
          <div className="funnel">
            {(['new', 'review', 'planned', 'done'] as const).map((st, i) => {
              const n = liveIdeas.filter((x) => x.status === st).length
              return (
                <div key={st} className={`funnel-step f${i}`} data-tip={`${IDEA_STATUS[st].label}: ${n}`}>
                  <b><CountUp value={n} /></b>
                  <span>{IDEA_STATUS[st].label}</span>
                </div>
              )
            })}
          </div>
          <h3 className="mt">Latest ideas from surveys</h3>
          {[...new Set(filtered.flatMap((s: Submission) => [s.quick_win, ...(s.ideas ?? [])].map((x) => x?.trim()).filter(Boolean)))].slice(0, 5).map((idea, i) => (
            <p key={i} className="quote" dir="auto">“{idea}”</p>
          ))}
          {filtered.every((s) => !s.quick_win && !(s.ideas ?? []).some((x) => x.trim())) && <p className="muted small">No ideas yet.</p>}
        </section>
      </div>

      <section className="card control no-print">
        <h2>Survey control</h2>
        <div className="control-grid">
          <div>
            <p className="field-label">Surveys each person can send</p>
            <div className="row">
              <button type="button" className="secondary small-btn" onClick={() => void savePerPerson(perPerson - 1)} disabled={perPerson <= 1}>−</button>
              <strong className="big-num">{perPerson}</strong>
              <button type="button" className="secondary small-btn" onClick={() => void savePerPerson(perPerson + 1)}>+</button>
              <button type="button" onClick={() => confirm('Open a new round? Everyone will be able to send one more survey.') && void savePerPerson(perPerson + 1)}><RotateCcw size={15} /> Open a new round</button>
            </div>
            <p className="muted small">Drafts count too. To let just one person send another, use <Link to="/admin/users">Users & roles → +1</Link>.</p>
          </div>
          <div className="danger-zone">
            <p className="field-label">Start fresh</p>
            <p className="muted small">Deletes all surveys, feedback, ideas, kudos, points, reward requests, reports and e-mail history. People, departments, the directory and rewards stay.</p>
            <button type="button" className="danger" onClick={() => void resetAll()}>Reset all data…</button>
          </div>
        </div>
      </section>
    </div>
  )
}
