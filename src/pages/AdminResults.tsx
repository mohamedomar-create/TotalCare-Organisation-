import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Award, ChevronDown, ChevronUp, Crown, Download, Gift, Lightbulb, Rocket, Settings2, ShieldCheck, ThumbsDown, ThumbsUp, TrendingDown, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAdminData } from '../lib/useAdminData'
import { allIdeas, companyResults, departmentResults, isV2, nominations, reasonsFor, type DeptResult, type Ranked } from '../lib/results'
import { PLAYBOOK } from '../lib/initiatives'
import { SURVEY_DEPARTMENTS, deptByKey, type SurveyAnswers } from '../lib/survey'
import { CountUp } from '../components/ui'
import type { Submission } from '../lib/types'

const scoreColor = (v: number | null) => (v === null ? '#94a3b8' : v >= 8 ? '#16a34a' : v >= 6.5 ? '#65a30d' : v >= 5 ? '#d97706' : '#dc2626')

function downloadResults(subs: Submission[]) {
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const header = ['Response', 'Anonymous', 'My department', 'Level', 'Time at TotalCare', 'Based in', 'Answer quality',
    ...SURVEY_DEPARTMENTS.flatMap((d) => [`${d.name} score`, `${d.name} strengths`, `${d.name} weaknesses`, `${d.name} ideas`]),
    'Best manager 1', 'Best manager 2', 'Best manager 3', 'Best department 1', 'Best department 2', 'Best department 3', 'Best employee 1', 'Best employee 2', 'Best employee 3',
    'Problem 1', 'Problem 2', 'Problem 3', 'Strength 1', 'Strength 2', 'Strength 3', 'Idea 1', 'Idea 2', 'Idea 3', 'Idea 4', 'Idea 5', 'Reward code']
  const rows = subs.map((s, i) => {
    const a = (s.answers ?? {}) as SurveyAnswers
    const n = (xs: { name: string }[] | undefined, k: number) => xs?.[k]?.name ?? ''
    return [i + 1, s.anonymous ? 'yes' : 'no', deptByKey(a.my_dept ?? '')?.name ?? a.my_dept ?? '', s.role_level, a.tenure, a.location, s.quality?.score ?? '',
      ...SURVEY_DEPARTMENTS.flatMap((d) => { const r = a.depts?.[d.key]; return r?.skip ? ['skipped', '', '', ''] : [r?.score ?? '', r?.strengths ?? '', r?.weaknesses ?? '', r?.ideas ?? ''] }),
      n(a.best_managers, 0), n(a.best_managers, 1), n(a.best_managers, 2),
      ...[0, 1, 2].map((k) => deptByKey(a.best_departments?.[k] ?? '')?.name ?? ''),
      n(a.best_employees, 0), n(a.best_employees, 1), n(a.best_employees, 2),
      ...[0, 1, 2].map((k) => a.company_problems?.[k] ?? ''), ...[0, 1, 2].map((k) => a.company_strengths?.[k] ?? ''), ...[0, 1, 2, 3, 4].map((k) => a.company_ideas?.[k] ?? ''), a.reward_code ?? '']
  })
  const csv = [header, ...rows].map((r) => r.map(cell).join(',')).join('\n')
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  link.download = `totalcare-survey-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}

function Podium({ title, ar, icon, rows, reasons }: { title: string; ar: string; icon: React.ReactNode; rows: Ranked[]; reasons?: (key: string) => string[] }) {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <section className="card podium-card">
      <h2>{icon} {title} <span className="ar-title" lang="ar">{ar}</span></h2>
      {rows.length === 0 && <p className="muted small">No nominations yet.</p>}
      <ol className="podium-list">
        {rows.slice(0, 8).map((r, i) => (
          <li key={r.key} className={i < 3 ? `top m${i + 1}` : ''}>
            <button type="button" className="plain podium-row" onClick={() => setOpen(open === r.key ? null : r.key)}>
              <span className={`rank-badge m${Math.min(i + 1, 4)}`}>{i + 1}</span>
              <span className="grow" dir="auto">{r.label}</span>
              <span className="muted small" title={`${r.firsts} first-place vote${r.firsts === 1 ? '' : 's'}`}>{r.votes} vote{r.votes === 1 ? '' : 's'}</span>
              <b>{r.points} pts</b>
            </button>
            {open === r.key && reasons && (
              <ul className="reasons">{reasons(r.key).length ? reasons(r.key).map((t, j) => <li key={j} dir="auto">“{t}”</li>) : <li className="muted">No reasons written.</li>}</ul>
            )}
          </li>
        ))}
      </ol>
      <p className="muted tiny">1st place = 3 pts, 2nd = 2, 3rd = 1. Spelling variants of the same name are merged.</p>
    </section>
  )
}

function DeptCard({ d, onPlan }: { d: DeptResult; onPlan: (d: DeptResult) => void }) {
  const [open, setOpen] = useState(false)
  const max = Math.max(1, ...d.distribution)
  return (
    <div className="card dept-result" style={{ ['--c' as string]: d.color }}>
      <div className="row between">
        <h3>{d.emoji} {d.ar} <span className="muted">· {d.name}</span></h3>
        <span className="dept-score" style={{ color: scoreColor(d.average) }}>{d.average ?? '—'}<small>/10</small></span>
      </div>
      <div className="mini-dist" aria-label="Score distribution">
        {d.distribution.map((n, i) => <span key={i} title={`${i + 1}/10: ${n}`} style={{ height: `${(n / max) * 100}%`, background: i >= 8 ? '#16a34a' : i >= 6 ? '#d97706' : '#dc2626' }} />)}
      </div>
      <p className="muted small">
        {d.n} rating{d.n === 1 ? '' : 's'} from other departments{d.nps !== null && <> · score index <b>{d.nps > 0 ? '+' : ''}{d.nps}</b></>}
        {d.selfN > 0 && <> · own team rates itself <b>{d.selfAverage}</b></>}
        {d.skips > 0 && <> · {d.skips} don’t deal with them</>}
      </p>
      <div className="row">
        <span className="pill tone-green"><ThumbsUp size={12} /> {d.strengths.length}</span>
        <span className="pill tone-rose"><ThumbsDown size={12} /> {d.weaknesses.length}</span>
        <span className="pill tone-amber"><Lightbulb size={12} /> {d.ideas.length}</span>
        <span className="grow" />
        <button type="button" className="link" onClick={() => setOpen(!open)}>{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Comments</button>
        <button type="button" className="secondary small-btn" onClick={() => onPlan(d)}><Rocket size={14} /> Improvement plan</button>
      </div>
      {open && (
        <div className="dept-comments">
          {([['Strengths · المميزات', d.strengths], ['Weaknesses · العيوب', d.weaknesses], ['Ideas · الأفكار', d.ideas]] as const).map(([t, list]) => (
            <div key={t}>
              <b>{t}</b>
              {list.length === 0 ? <p className="muted small">None yet.</p> : (
                <ul>{list.map((c, i) => <li key={i} dir="auto">{c.text} <span className="muted tiny">— {c.self ? 'own team' : c.fromDept}</span></li>)}</ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminResults() {
  const { submissions, profiles, loading, error, reload } = useAdminData()
  const [includeLow, setIncludeLow] = useState(true)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  const sent = submissions.filter((s) => s.status === 'submitted' && isV2(s))
  const subs = includeLow ? sent : sent.filter((s) => s.quality?.level !== 'low')
  const lowCount = sent.filter((s) => s.quality?.level === 'low').length
  const depts = useMemo(() => departmentResults(subs).sort((a, b) => (b.average ?? -1) - (a.average ?? -1)), [subs])
  const noms = useMemo(() => nominations(subs), [subs])
  const company = useMemo(() => companyResults(subs), [subs])
  const ideas = useMemo(() => allIdeas(subs), [subs])
  const anonymousShare = sent.length ? Math.round((sent.filter((s) => s.anonymous).length / sent.length) * 100) : 0
  const drafts = submissions.filter((s) => s.status === 'draft').length
  const participation = profiles.length ? Math.min(100, Math.round((sent.length / profiles.length) * 100)) : null

  async function createInitiative(fields: Record<string, unknown>, message: string) {
    const { error } = await supabase.from('initiatives').insert({ status: 'proposed', visible: false, ...fields })
    setNotice(error ? { ok: false, text: error.message } : { ok: true, text: message })
    void reload()
  }

  function planFor(d: DeptResult) {
    const weaknesses = d.weaknesses.slice(0, 5).map((c) => `• ${c.text}`).join('\n')
    const ideaList = d.ideas.slice(0, 5).map((c) => `• ${c.text}`).join('\n')
    void createInitiative({
      title: `Improvement plan: ${d.name} · خطة تطوير ${d.ar}`,
      theme: d.key,
      description: `Survey score ${d.average ?? '—'}/10 from ${d.n} colleagues.\n\nWhat people want fixed:\n${weaknesses || '—'}\n\nTheir ideas:\n${ideaList || '—'}`,
      kpi: `${d.name} survey score`,
      baseline: d.average !== null ? `${d.average}/10` : '',
      target: d.average !== null ? `${Math.min(10, Math.round((d.average + 1.5) * 10) / 10)}/10 next survey` : '',
      impact: 4,
      effort: 3,
      source: 'Department survey',
    }, `Improvement plan for ${d.name} created. Approve and publish it on the Initiatives page.`)
  }

  const weakest = depts.filter((d) => d.average !== null && d.n >= 3).slice(-2).reverse()
  const playbookHits = company.problems.slice(0, 6).flatMap((p) => (PLAYBOOK[p.text] ?? []).map((t) => ({ problem: p, t })))

  if (loading) return <div className="page"><p className="muted">Loading…</p></div>

  return (
    <div className="page wide">
      <div className="row between">
        <div>
          <h1>Survey results <span className="ar-title" lang="ar">نتايج الاستبيان</span></h1>
          <p className="muted">Department survey · {sent.length} answers · names are never shown here.</p>
        </div>
        <div className="row">
          <label className="inline-check small"><input type="checkbox" checked={includeLow} onChange={(e) => setIncludeLow(e.target.checked)} /> Include low-quality answers ({lowCount})</label>
          <button type="button" className="secondary" onClick={() => downloadResults(subs)}><Download size={15} /> Export</button>
          <Link to="/admin/pulse" className="button secondary"><Settings2 size={15} /> Survey settings & earlier pulse</Link>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      {notice && <p className={notice.ok ? 'notice' : 'error'}>{notice.text} {notice.ok && <Link to="/initiatives">Open initiatives →</Link>}</p>}

      <div className="kpi-grid">
        <div className="kpi"><span className="kpi-head"><Users size={16} />Answers</span><span className="kpi-value"><CountUp value={sent.length} /></span><span className="kpi-hint">{drafts} still in progress</span></div>
        <Link to="/admin/coverage" className="kpi plain"><span className="kpi-head"><Users size={16} />Participation</span><span className="kpi-value">{participation === null ? '—' : <><CountUp value={participation} />%</>}</span><span className="kpi-hint">of {profiles.length} signed-up colleagues · see who’s missing</span></Link>
        <div className="kpi"><span className="kpi-head"><ShieldCheck size={16} />Sent anonymously</span><span className="kpi-value"><CountUp value={anonymousShare} />%</span><span className="kpi-hint">a high share can mean people don’t feel safe yet</span></div>
        <div className="kpi"><span className="kpi-head"><Award size={16} />Answer quality</span><span className="kpi-value">{sent.length ? <><CountUp value={Math.round(sent.reduce((a, s) => a + (s.quality?.score ?? 100), 0) / sent.length)} />/100</> : '—'}</span><span className="kpi-hint">{lowCount} low-quality answer{lowCount === 1 ? '' : 's'}</span></div>
      </div>

      {sent.length === 0 && <div className="card empty-state"><p>No answers yet. Share the survey from <Link to="/admin/coverage">Coverage & invites</Link>.</p></div>}

      {sent.length > 0 && (
        <>
          <h2>Departments, ranked <span className="ar-title" lang="ar">ترتيب الإدارات</span></h2>
          <p className="muted small">Average score from other departments (a team’s rating of itself is shown separately and doesn’t count). Score index = % of 9–10 minus % of 1–6.</p>
          <div className="dept-grid">
            {depts.map((d) => <DeptCard key={d.key} d={d} onPlan={planFor} />)}
          </div>

          <h2>The best at TotalCare <span className="ar-title" lang="ar">الأحسن في TotalCare</span></h2>
          <div className="podium-grid">
            <Podium title="Best manager" ar="أحسن مدير" icon={<Crown size={18} />} rows={noms.managers} reasons={(k) => reasonsFor(subs, 'best_managers', k)} />
            <Podium title="Best department" ar="أحسن إدارة" icon={<Award size={18} />} rows={noms.departments} />
            <Podium title="Best employee" ar="أحسن موظف" icon={<Users size={18} />} rows={noms.employees} reasons={(k) => reasonsFor(subs, 'best_employees', k)} />
          </div>

          <div className="two-col">
            <section className="card">
              <h2><TrendingDown size={18} /> Biggest company problems <span className="ar-title" lang="ar">أكبر المشاكل</span></h2>
              <Bars rows={company.problems} color="#dc2626" />
            </section>
            <section className="card">
              <h2><ThumbsUp size={18} /> Best company strengths <span className="ar-title" lang="ar">أحسن المميزات</span></h2>
              <Bars rows={company.strengths} color="#16a34a" />
            </section>
          </div>

          {(weakest.length > 0 || playbookHits.length > 0) && (
            <section className="card suggest-card">
              <h2><Rocket size={18} /> Suggested initiatives <span className="ar-title" lang="ar">مبادرات مقترحة</span></h2>
              <p className="muted small">From the lowest-rated departments and the most-mentioned problems. Each one is created as a hidden proposal for you to edit, approve and publish.</p>
              {weakest.map((d) => (
                <div key={d.key} className="suggest-row">
                  <span className="grow"><b>Improvement plan for {d.name}</b> — scored {d.average}/10; {d.weaknesses.length} weaknesses and {d.ideas.length} ideas collected.</span>
                  <button type="button" className="secondary small-btn" onClick={() => planFor(d)}>Create</button>
                </div>
              ))}
              {playbookHits.map(({ problem, t }) => (
                <div key={problem.text + t.title} className="suggest-row">
                  <span className="grow"><b>{t.title}</b> <span lang="ar" className="muted">· {t.ar}</span><br /><span className="muted small">Because {problem.count} people named “{problem.text}”. KPI: {t.kpi} → {t.target}</span></span>
                  <button type="button" className="secondary small-btn" onClick={() => void createInitiative({ title: t.title, description: t.description, theme: problem.text, kpi: t.kpi, baseline: t.baseline, target: t.target, impact: t.impact, effort: t.effort, source: `Company problem: ${problem.text}` }, `“${t.title}” created as a proposal.`)}>Create</button>
                </div>
              ))}
            </section>
          )}

          <section className="card">
            <h2><Lightbulb size={18} /> All ideas ({ideas.length}) <span className="ar-title" lang="ar">كل الأفكار</span></h2>
            <p className="muted small"><Gift size={13} /> Pick the best ones: turn an idea into an initiative, then mark it as the winning idea on the Initiatives page. Anonymous authors claim the reward with their code.</p>
            <ul className="idea-rows">
              {ideas.map((i, n) => (
                <li key={n}>
                  <span className="pill tone-slate">{i.source}</span>
                  <span className="grow" dir="auto">{i.text}</span>
                  <span className="muted tiny">from {i.fromDept}{i.anonymous ? ' · anonymous' : ''}</span>
                  <button type="button" className="secondary small-btn" onClick={() => void createInitiative({ title: i.text.slice(0, 150), description: i.text, theme: i.source, source: `Survey idea (${i.source}) from ${i.fromDept}`, reward_code: i.anonymous ? i.rewardCode ?? '' : '' }, 'Idea turned into a proposed initiative.')}><Rocket size={13} /> Initiative</button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}

function Bars({ rows, color }: { rows: { text: string; count: number }[]; color: string }) {
  if (!rows.length) return <p className="muted small">No answers yet.</p>
  const max = Math.max(...rows.map((r) => r.count))
  return (
    <div className="barlist">
      {rows.slice(0, 12).map((r) => (
        <div key={r.text} className="barlist-row">
          <span className="barlist-label" dir="auto">{r.text}</span>
          <span className="barlist-track"><span className="barlist-fill" style={{ width: `${(r.count / max) * 100}%`, background: color }} /></span>
          <span className="barlist-value">{r.count}</span>
        </div>
      ))}
    </div>
  )
}
