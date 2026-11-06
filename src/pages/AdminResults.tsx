import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle, Award, BarChart3, ChevronDown, ChevronUp, ClipboardCheck, Crown, Download, Filter, Gift, Gauge, Lightbulb, Printer,
  Rocket, Settings2, ShieldCheck, Sparkles, ThumbsDown, ThumbsUp, TrendingDown, Users,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAdminData } from '../lib/useAdminData'
import {
  MIN_GROUP, allIdeas, applySegment, audit, companyResults, companyScore, crossMatrix, departmentResults, highlights, isV2, nominations,
  reasonsFor, themeCounts, type DeptResult, type Ranked, type Segment, type ThemeRow,
} from '../lib/results'
import { PLAYBOOK } from '../lib/initiatives'
import { LOCATION_OPTIONS, MY_DEPARTMENT_EXTRA, ROLE_LEVELS, SURVEY_DEPARTMENTS, TENURE_OPTIONS, deptByKey, type SurveyAnswers } from '../lib/survey'
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


const TABS = [
  { key: 'overview', label: 'Overview', ar: 'نظرة عامة', icon: Gauge },
  { key: 'departments', label: 'Departments', ar: 'الإدارات', icon: BarChart3 },
  { key: 'bestworst', label: 'Best & worst', ar: 'الأحسن والأسوأ', icon: Sparkles },
  { key: 'people', label: 'People', ar: 'الأشخاص', icon: Crown },
  { key: 'actions', label: 'Ideas & actions', ar: 'الأفكار والمبادرات', icon: Rocket },
  { key: 'audit', label: 'Audit', ar: 'المراجعة', icon: ClipboardCheck },
] as const
type TabKey = (typeof TABS)[number]['key']

function Gauge10({ value }: { value: number | null }) {
  const pct = value === null ? 0 : ((value - 1) / 9) * 100
  return (
    <div className="gauge" style={{ ['--p' as string]: pct, ['--c' as string]: scoreColor(value) }}>
      <div className="gauge-inner"><b>{value ?? '—'}</b><small>/10</small></div>
    </div>
  )
}

export default function AdminResults() {
  const { submissions, profiles, loading, error, reload } = useAdminData()
  const [tab, setTab] = useState<TabKey>('overview')
  const [includeLow, setIncludeLow] = useState(true)
  const [seg, setSeg] = useState<Segment>({})
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  const sent = submissions.filter((s) => s.status === 'submitted' && isV2(s))
  const base = includeLow ? sent : sent.filter((s) => s.quality?.level !== 'low')
  const filtered = applySegment(base, seg)
  const segmented = Object.values(seg).some(Boolean)
  // A filter that leaves fewer than 3 answers would point at individuals: show nothing instead.
  const tooSmall = segmented && filtered.length < MIN_GROUP
  const subs = tooSmall ? [] : filtered

  const depts = useMemo(() => departmentResults(subs).sort((a, b) => (b.average ?? -1) - (a.average ?? -1)), [subs])
  const noms = useMemo(() => nominations(subs), [subs])
  const company = useMemo(() => companyResults(subs), [subs])
  const ideas = useMemo(() => allIdeas(subs), [subs])
  const score = useMemo(() => companyScore(subs), [subs])
  const facts = useMemo(() => highlights(subs), [subs])
  const praise = useMemo(() => themeCounts(depts, 'strengths'), [depts])
  const complaints = useMemo(() => themeCounts(depts, 'weaknesses'), [depts])
  const matrix = useMemo(() => crossMatrix(subs), [subs])
  const checks = useMemo(() => audit(tab === 'audit' ? (segmented ? subs : sent) : []), [tab, subs, sent, segmented])

  const lowCount = sent.filter((s) => s.quality?.level === 'low').length
  const anonymousShare = sent.length ? Math.round((sent.filter((s) => s.anonymous).length / sent.length) * 100) : 0
  const drafts = submissions.filter((s) => s.status === 'draft').length
  const members = profiles.filter((p) => p.active !== false).length
  const participation = members ? Math.min(100, Math.round((sent.length / members) * 100)) : null

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

  const weakest = depts.filter((d) => d.average !== null && d.n >= MIN_GROUP).slice(-2).reverse()
  const playbookHits = company.problems.slice(0, 6).flatMap((p) => (PLAYBOOK[p.text] ?? []).map((t) => ({ problem: p, t })))
  const set = (patch: Partial<Segment>) => setSeg((x) => ({ ...x, ...patch }))

  if (loading) return <div className="page"><p className="muted">Loading…</p></div>

  return (
    <div className="page wide dashboard">
      <div className="row between no-print-row">
        <div>
          <h1>Survey dashboard <span className="ar-title" lang="ar">لوحة نتايج الاستبيان</span></h1>
          <p className="muted">{sent.length} answers{segmented && !tooSmall ? ` · showing ${subs.length} that match the filter` : ''} · names are never shown here.</p>
        </div>
        <div className="row no-print">
          <button type="button" className="secondary" onClick={() => window.print()}><Printer size={15} /> Print / PDF</button>
          <button type="button" className="secondary" onClick={() => downloadResults(subs)}><Download size={15} /> Export</button>
          <Link to="/admin/pulse" className="button secondary"><Settings2 size={15} /> Settings</Link>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      {notice && <p className={notice.ok ? 'notice' : 'error'}>{notice.text} {notice.ok && <Link to="/initiatives">Open initiatives →</Link>}</p>}

      <div className="card filter-bar no-print">
        <Filter size={16} />
        <select value={seg.dept ?? ''} onChange={(e) => set({ dept: e.target.value || undefined })}>
          <option value="">All departments</option>
          {[...SURVEY_DEPARTMENTS, ...MY_DEPARTMENT_EXTRA].map((d) => <option key={d.key} value={d.key}>{d.name}</option>)}
        </select>
        <select value={seg.level ?? ''} onChange={(e) => set({ level: e.target.value || undefined })}>
          <option value="">All levels</option>
          {ROLE_LEVELS.map((l) => <option key={l}>{l}</option>)}
        </select>
        <select value={seg.tenure ?? ''} onChange={(e) => set({ tenure: e.target.value || undefined })}>
          <option value="">Any time at TotalCare</option>
          {TENURE_OPTIONS.map((l) => <option key={l}>{l}</option>)}
        </select>
        <select value={seg.location ?? ''} onChange={(e) => set({ location: e.target.value || undefined })}>
          <option value="">All locations</option>
          {LOCATION_OPTIONS.map((l) => <option key={l}>{l}</option>)}
        </select>
        <select value={seg.mode ?? ''} onChange={(e) => set({ mode: (e.target.value || undefined) as Segment['mode'] })}>
          <option value="">Named + anonymous</option>
          <option value="named">Named only</option>
          <option value="anonymous">Anonymous only</option>
        </select>
        <label className="inline-check small"><input type="checkbox" checked={includeLow} onChange={(e) => setIncludeLow(e.target.checked)} /> Include low-quality ({lowCount})</label>
        {segmented && <button type="button" className="link" onClick={() => setSeg({})}>Clear</button>}
      </div>
      {tooSmall && <p className="notice"><ShieldCheck size={15} /> Fewer than {MIN_GROUP} answers match this filter. Results are hidden so nobody can be identified — widen the filter.</p>}

      <div className="dash-tabs no-print" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={tab === t.key ? 'on' : ''} onClick={() => setTab(t.key)}>
            <t.icon size={16} /> {t.label} <span className="muted small" lang="ar">{t.ar}</span>
          </button>
        ))}
      </div>

      {sent.length === 0 && <div className="card empty-state"><p>No answers yet. Invite people from <Link to="/admin/invitations">Invitations</Link> and track them on <Link to="/admin/coverage">Coverage</Link>.</p></div>}

      {sent.length > 0 && tab === 'overview' && (
        <>
          <div className="overview-top">
            <div className="card score-card">
              <h2><Gauge size={18} /> Company score</h2>
              <Gauge10 value={score.average} />
              <p className="muted small">Average of {score.n} department ratings (own department excluded) · index <b>{score.index ?? '—'}</b>/100</p>
            </div>
            <div className="kpi-grid overview-kpis">
              <div className="kpi"><span className="kpi-head"><Users size={16} />Answers</span><span className="kpi-value"><CountUp value={sent.length} /></span><span className="kpi-hint">{drafts} still in progress</span></div>
              <Link to="/admin/coverage" className="kpi plain"><span className="kpi-head"><Users size={16} />Participation</span><span className="kpi-value">{participation === null ? '—' : <><CountUp value={participation} />%</>}</span><span className="kpi-hint">of {members} people who joined</span></Link>
              <div className="kpi"><span className="kpi-head"><ShieldCheck size={16} />Anonymous</span><span className="kpi-value"><CountUp value={anonymousShare} />%</span><span className="kpi-hint">high = people don’t feel safe yet</span></div>
              <div className="kpi"><span className="kpi-head"><Award size={16} />Answer quality</span><span className="kpi-value">{sent.length ? <><CountUp value={Math.round(sent.reduce((a, s) => a + (s.quality?.score ?? 100), 0) / sent.length)} />/100</> : '—'}</span><span className="kpi-hint">{lowCount} low-quality</span></div>
            </div>
          </div>

          <h2>Highlights <span className="ar-title" lang="ar">أهم النتايج</span></h2>
          <div className="highlight-grid">
            {facts.map((f) => (
              <div key={f.label} className={`card highlight ${f.tone}`}>
                <span className="small">{f.tone === 'good' ? <ThumbsUp size={14} /> : <ThumbsDown size={14} />} {f.label} <span lang="ar" className="muted">· {f.ar}</span></span>
                <b dir="auto">{f.value}</b>
                <span className="muted small">{f.detail}</span>
              </div>
            ))}
          </div>

          <section className="card">
            <h2><BarChart3 size={18} /> Department scores <span className="ar-title" lang="ar">تقييم الإدارات</span></h2>
            <div className="rank-bars">
              {depts.map((d, i) => (
                <div key={d.key} className="rank-bar">
                  <span className="rank-pos">{i + 1}</span>
                  <span className="rank-name">{d.emoji} {d.name} <span className="muted small" lang="ar">{d.ar}</span></span>
                  <span className="rank-track"><span style={{ width: `${((d.average ?? 0) / 10) * 100}%`, background: scoreColor(d.average) }} /></span>
                  <b style={{ color: scoreColor(d.average) }}>{d.average ?? '—'}</b>
                  <span className="muted tiny">{d.n} ratings{d.n > 0 && d.n < MIN_GROUP ? ' · too few' : ''}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="two-col">
            <ThemePanel title="What people praise" ar="الحاجات الحلوة" rows={praise} good />
            <ThemePanel title="What people complain about" ar="الحاجات الوحشة" rows={complaints} />
          </div>
        </>
      )}

      {subs.length > 0 && tab === 'departments' && (
        <>
          <p className="muted small">Average score from other departments (a team’s rating of itself is shown separately and doesn’t count). Score index = % of 9–10 minus % of 1–6.</p>
          <div className="dept-grid">
            {depts.map((d) => <DeptCard key={d.key} d={d} onPlan={planFor} />)}
          </div>
          <section className="card">
            <h2>Who rates whom <span className="ar-title" lang="ar">مين بيقيّم مين</span></h2>
            <p className="muted small">Rows: the department of the person answering. Columns: the department rated. Shaded diagonal = rating their own department. Cells with fewer than {MIN_GROUP} answers are hidden.</p>
            <div className="heat-scroll">
              <table className="xmatrix">
                <thead><tr><th>From ↓ · Rated →</th>{SURVEY_DEPARTMENTS.map((d) => <th key={d.key} title={d.name}>{d.emoji}<br /><span className="tiny">{d.name.split(' ')[0]}</span></th>)}</tr></thead>
                <tbody>
                  {matrix.map((r) => (
                    <tr key={r.from.key}>
                      <th>{r.from.emoji} {r.from.name} <span className="muted tiny">({r.n})</span></th>
                      {r.cells.map((c, i) => (
                        <td key={i} className={c.self ? 'self' : ''} style={!c.hidden && c.average !== null ? { background: heat(c.average), color: c.average <= 4 || c.average >= 8.5 ? '#fff' : '#0f172a' } : undefined} title={c.hidden ? `${c.n} answer(s) — hidden` : `${c.n} answers`}>
                          {c.hidden ? '·' : c.average ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {subs.length > 0 && tab === 'bestworst' && (
        <>
          <div className="two-col">
            <ThemePanel title="What people praise" ar="الحاجات الحلوة" rows={praise} good withExamples />
            <ThemePanel title="What people complain about" ar="الحاجات الوحشة" rows={complaints} withExamples />
          </div>
          <section className="card">
            <h2>Complaints by department <span className="ar-title" lang="ar">الشكاوى حسب الإدارة</span></h2>
            <p className="muted small">How often each problem theme was written about each department. Darker = more mentions.</p>
            <ThemeMatrix rows={complaints} />
          </section>
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
          <div className="two-col">
            <TopList title="Best-rated departments" ar="الأعلى تقييماً" rows={depts.filter((d) => d.n >= MIN_GROUP).slice(0, 3)} good />
            <TopList title="Lowest-rated departments" ar="الأقل تقييماً" rows={depts.filter((d) => d.n >= MIN_GROUP).slice(-3).reverse()} />
          </div>
        </>
      )}

      {subs.length > 0 && tab === 'people' && (
        <div className="podium-grid">
          <Podium title="Best manager" ar="أحسن مدير" icon={<Crown size={18} />} rows={noms.managers} reasons={(k) => reasonsFor(subs, 'best_managers', k)} />
          <Podium title="Best department" ar="أحسن إدارة" icon={<Award size={18} />} rows={noms.departments} />
          <Podium title="Best employee" ar="أحسن موظف" icon={<Users size={18} />} rows={noms.employees} reasons={(k) => reasonsFor(subs, 'best_employees', k)} />
        </div>
      )}

      {subs.length > 0 && tab === 'actions' && (
        <>
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

      {sent.length > 0 && tab === 'audit' && !tooSmall && (
        <>
          <div className="kpi-grid">
            <div className="kpi"><span className="kpi-head"><Award size={16} />High quality</span><span className="kpi-value">{checks.quality.high}</span><span className="kpi-hint">of {checks.total} answers</span></div>
            <div className="kpi"><span className="kpi-head"><AlertTriangle size={16} />Low quality</span><span className="kpi-value">{checks.quality.low}</span><span className="kpi-hint">{checks.quality.medium} medium</span></div>
            <div className="kpi"><span className="kpi-head"><ClipboardCheck size={16} />Median time</span><span className="kpi-value">{checks.medianMinutes ?? '—'}<small> min</small></span><span className="kpi-hint">{checks.flags.rushed} rushed (&lt; 3 min)</span></div>
            <div className="kpi"><span className="kpi-head"><Users size={16} />Voted own dept best</span><span className="kpi-value">{checks.ownDeptVotes}%</span><span className="kpi-hint">of first-place “best department” votes</span></div>
          </div>
          <div className="two-col">
            <section className="card">
              <h2>Answer checks</h2>
              <ul className="audit-list">
                <li><span>Same score for every department</span><b>{checks.flags.straightLined}</b></li>
                <li><span>Answered in under 3 minutes</span><b>{checks.flags.rushed}</b></li>
                <li><span>All scores at the extreme (all 1–2 or all 10)</span><b>{checks.flags.extreme}</b></li>
                <li><span>Double-checks raised while answering</span><b>{checks.flags.checksRaised}</b></li>
              </ul>
              <p className="muted small">Self-nominations and duplicate names are blocked before sending, so they never reach the results.</p>
            </section>
            <section className="card">
              <h2>Completeness</h2>
              <div className="barlist">
                {checks.completeness.map((c) => (
                  <div key={c.label} className="barlist-row">
                    <span className="barlist-label">{c.label}</span>
                    <span className="barlist-track"><span className="barlist-fill" style={{ width: `${c.pct}%`, background: c.pct >= 80 ? '#16a34a' : c.pct >= 50 ? '#d97706' : '#dc2626' }} /></span>
                    <span className="barlist-value">{c.pct}%</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
          <div className="two-col">
            <section className="card">
              <h2>Self-rating bias</h2>
              <p className="muted small">How each department rates itself vs. how others rate it. A gap above +2 suggests a blind spot.</p>
              {checks.selfBias.length === 0 ? <p className="muted small">Not enough self-ratings yet.</p> : (
                <table className="coverage-table">
                  <thead><tr><th>Department</th><th>Itself</th><th>Others</th><th>Gap</th></tr></thead>
                  <tbody>{checks.selfBias.map((b) => <tr key={b.key}><td>{b.name}</td><td>{b.self}</td><td>{b.others}</td><td><span className={`pill ${b.gap > 2 ? 'tone-rose' : b.gap > 1 ? 'tone-amber' : 'tone-green'}`}>{b.gap > 0 ? '+' : ''}{b.gap}</span></td></tr>)}</tbody>
                </table>
              )}
            </section>
            <section className="card">
              <h2>“I don’t deal with them”</h2>
              <p className="muted small">Departments many people skip may be invisible to the rest of the company.</p>
              <div className="barlist">
                {checks.skips.map((k) => (
                  <div key={k.key} className="barlist-row">
                    <span className="barlist-label">{k.name}</span>
                    <span className="barlist-track"><span className="barlist-fill" style={{ width: `${k.pct}%`, background: '#64748b' }} /></span>
                    <span className="barlist-value">{k.skips}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
          <div className="two-col">
            <section className="card">
              <h2>Answers per day</h2>
              <div className="day-bars">
                {checks.perDay.map((d) => {
                  const max = Math.max(...checks.perDay.map((x) => x.count))
                  return <span key={d.day} title={`${d.day}: ${d.count}`}><i style={{ height: `${(d.count / max) * 100}%` }} /><small>{d.day.slice(5)}</small></span>
                })}
              </div>
            </section>
            <section className="card">
              <h2>Flagged answers ({checks.flagged.length})</h2>
              <p className="muted small">Read these before trusting their scores. Use the filter “Include low-quality” to leave them out.</p>
              <ul className="audit-list">
                {checks.flagged.slice(0, 12).map((f) => (
                  <li key={f.id}><Link to={`/admin/submissions/${f.id}`}>Response</Link><span className="grow">{f.reasons.join(' · ')}</span><b>{f.score ?? '—'}</b></li>
                ))}
                {checks.flagged.length === 0 && <li className="muted">Nothing flagged.</li>}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  )
}

/** Red (1) → amber → green (10). */
function heat(v: number) {
  const t = Math.max(0, Math.min(1, (v - 1) / 9))
  const hue = Math.round(t * 130)
  return `hsl(${hue} 72% ${t > 0.85 ? 36 : t < 0.4 ? 48 : 55}%)`
}

function ThemePanel({ title, ar, rows, good, withExamples }: { title: string; ar: string; rows: ThemeRow[]; good?: boolean; withExamples?: boolean }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <section className={`card theme-panel ${good ? 'good' : 'bad'}`}>
      <h2>{good ? <ThumbsUp size={18} /> : <ThumbsDown size={18} />} {title} <span className="ar-title" lang="ar">{ar}</span></h2>
      {rows.length === 0 && <p className="muted small">Nothing written yet.</p>}
      {rows.slice(0, 8).map((r) => (
        <div key={r.key} className="theme-row">
          <div className="barlist-row">
            <span className="barlist-label">{r.label} <span className="muted tiny" lang="ar">{r.ar}</span></span>
            <span className="barlist-track"><span className="barlist-fill" style={{ width: `${(r.count / max) * 100}%`, background: good ? '#16a34a' : '#dc2626' }} /></span>
            <span className="barlist-value">{r.count}</span>
          </div>
          {withExamples && (
            <ul className="theme-examples">
              {r.examples.map((e, i) => <li key={i} dir="auto">“{e.text}” <span className="muted tiny">— about {deptByKey(e.dept)?.name}, from {e.self ? 'their own team' : e.fromDept}</span></li>)}
            </ul>
          )}
        </div>
      ))}
      <p className="muted tiny">Sorted automatically by keywords in English and Arabic. One comment can count in two themes.</p>
    </section>
  )
}

function ThemeMatrix({ rows }: { rows: ThemeRow[] }) {
  const max = Math.max(1, ...rows.flatMap((r) => Object.values(r.byDept)))
  if (!rows.length) return <p className="muted small">No complaints written yet.</p>
  return (
    <div className="heat-scroll">
      <table className="xmatrix">
        <thead><tr><th>Theme</th>{SURVEY_DEPARTMENTS.map((d) => <th key={d.key} title={d.name}>{d.emoji}<br /><span className="tiny">{d.name.split(' ')[0]}</span></th>)}</tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <th>{r.label}</th>
              {SURVEY_DEPARTMENTS.map((d) => {
                const n = r.byDept[d.key] ?? 0
                return <td key={d.key} style={n ? { background: `rgb(220 38 38 / ${0.15 + (n / max) * 0.75})`, color: n / max > 0.5 ? '#fff' : '#0f172a' } : undefined}>{n || ''}</td>
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TopList({ title, ar, rows, good }: { title: string; ar: string; rows: DeptResult[]; good?: boolean }) {
  return (
    <section className={`card theme-panel ${good ? 'good' : 'bad'}`}>
      <h2>{good ? <ThumbsUp size={18} /> : <ThumbsDown size={18} />} {title} <span className="ar-title" lang="ar">{ar}</span></h2>
      {rows.length === 0 && <p className="muted small">Not enough ratings yet (each department needs {MIN_GROUP}).</p>}
      {rows.map((d) => {
        const quote = (good ? d.strengths : d.weaknesses)[0]
        return (
          <div key={d.key} className="top-dept">
            <div className="row between"><b>{d.emoji} {d.name}</b><b style={{ color: scoreColor(d.average) }}>{d.average}/10</b></div>
            {quote && <p className="small muted" dir="auto">“{quote.text}”</p>}
          </div>
        )
      })}
    </section>
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

