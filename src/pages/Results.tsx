import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Award, CheckCircle2, Crown, Eye, EyeOff, Lightbulb, Maximize2, MessageSquareQuote, ShieldCheck, ThumbsDown, ThumbsUp, TrendingUp, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { ARABIC, SURVEY_DEPARTMENTS, deptByKey } from '../lib/survey'

interface Count { text: string; count: number }
interface Nominee { name?: string; key?: string; points: number; votes: number; firsts: number }
interface DeptRow { key: string; n: number; avg: number | null; high: number | null; low: number | null; strengths: Count[]; weaknesses: Count[] }
interface Summary {
  allowed: boolean
  published: boolean
  responses?: number
  people?: number
  company?: { avg: number | null; n: number; high: number; low: number }
  departments?: DeptRow[]
  problems?: Count[]
  strengths?: Count[]
  best_departments?: Nominee[]
  best_managers?: Nominee[]
  best_employees?: Nominee[]
  ideas?: number
}

/** Plain words for a 1–10 score, so anyone can read it at a glance. */
function verdict(avg: number | null) {
  if (avg === null) return { en: 'Not enough answers yet', ar: 'إجابات مش كفاية', tone: 'none' as const }
  if (avg >= 8) return { en: 'Strong', ar: 'قوي', tone: 'good' as const }
  if (avg >= 6) return { en: 'OK — room to improve', ar: 'كويس ومحتاج تحسين', tone: 'ok' as const }
  return { en: 'Needs attention', ar: 'محتاج اهتمام', tone: 'bad' as const }
}
const ar = (t: string) => ARABIC[t]
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)

function Verdict({ avg }: { avg: number | null }) {
  const v = verdict(avg)
  const Icon = v.tone === 'good' ? CheckCircle2 : v.tone === 'bad' ? AlertTriangle : v.tone === 'ok' ? TrendingUp : EyeOff
  return <span className={`verdict v-${v.tone}`}><Icon size={14} /> {v.en} <span lang="ar">· {v.ar}</span></span>
}

/** A counted list: the bar length is the share of people who gave that answer. */
function CountList({ items, total, empty }: { items: Count[]; total: number; empty: string }) {
  if (!items.length) return <p className="muted small">{empty}</p>
  const max = Math.max(...items.map((i) => i.count))
  return (
    <ol className="count-list">
      {items.map((i) => (
        <li key={i.text} title={`${i.count} of ${total} people`}>
          <div className="count-row">
            <span className="count-text" dir="auto">{i.text}{ar(i.text) && <span className="muted small" lang="ar"> · {ar(i.text)}</span>}</span>
            <b>{i.count}</b>
          </div>
          <div className="count-bar"><span style={{ width: `${(i.count / max) * 100}%` }} /></div>
        </li>
      ))}
    </ol>
  )
}

function Podium({ title, arTitle, items, dept }: { title: string; arTitle: string; items: Nominee[]; dept?: boolean }) {
  return (
    <div className="card podium-card">
      <h3><Crown size={16} /> {title} <span className="muted" lang="ar">· {arTitle}</span></h3>
      {items.length === 0 ? <p className="muted small">Not enough votes yet — names need 2 or more votes. · لسه مفيش أصوات كفاية</p> : (
        <ol className="podium">
          {items.map((n, i) => {
            const d = dept ? deptByKey(n.key ?? '') : undefined
            return (
              <li key={i} className={`place p${i + 1}`}>
                <span className="medal" aria-label={`Place ${i + 1}`}>{['🥇', '🥈', '🥉'][i]}</span>
                <span className="grow">
                  <b dir="auto">{d ? `${d.emoji} ${d.name}` : n.name}</b>
                  {d && <span className="muted small" lang="ar"> · {d.ar}</span>}
                  <span className="muted small block">{n.votes} votes · {n.firsts} first place</span>
                </span>
                <span className="points">{n.points}<small> pts</small></span>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

export default function Results() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [data, setData] = useState<Summary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const pageRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('results_summary')
    if (error) return setError(/results_summary/.test(error.message) ? 'Run supabase/migrations/0013_results_for_everyone.sql first.' : error.message)
    setData(data as Summary)
  }, [])
  useEffect(() => { void load() }, [load])

  async function share(on: boolean) {
    setBusy(true)
    const { error } = await supabase.rpc('set_results_published', { p_on: on })
    setBusy(false)
    if (error) return setError(error.message)
    await load()
  }

  if (error) return <div className="page"><p className="error">{error}</p></div>
  if (!data) return <div className="page"><p className="muted">Loading the results…</p></div>
  if (!data.allowed) {
    return (
      <div className="page narrow-page center-text">
        <div className="card">
          <EyeOff size={40} className="muted" />
          <h1>Results are coming soon</h1>
          <p lang="ar" dir="rtl">النتايج هتتنشر هنا قريب</p>
          <p className="muted">When the survey closes, the results will appear here for everyone — combined, with no names on any answer.</p>
        </div>
      </div>
    )
  }

  const responses = data.responses ?? 0
  const people = data.people ?? 0
  const depts = (data.departments ?? []).map((d) => ({ ...d, info: deptByKey(d.key) })).filter((d) => d.info)
  const shown = depts.filter((d) => d.avg !== null).sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0))
  const waiting = SURVEY_DEPARTMENTS.filter((d) => !shown.some((s) => s.key === d.key))
  const best = shown[0]
  const worst = shown.length > 1 ? shown[shown.length - 1] : undefined
  const company = data.company?.avg ?? null

  return (
    <div className="page wide results-page" ref={pageRef}>
      <header className="results-head">
        <div>
          <p className="hero-kicker">TotalCare Egypt · People survey {new Date().getFullYear()}</p>
          <h1>What we said <span className="ar-title" lang="ar">نتايج الاستبيان</span></h1>
          <p className="muted">Combined answers from {responses} {responses === 1 ? 'colleague' : 'colleagues'}. No names are shown with any answer.</p>
        </div>
        {(isAdmin || profile?.role === 'management') && (
          <div className="results-actions">
            {isAdmin && (data.published
              ? <button type="button" className="secondary" disabled={busy} onClick={() => void share(false)}><EyeOff size={15} /> Stop sharing</button>
              : <button type="button" disabled={busy} onClick={() => void share(true)}><Eye size={15} /> Share with everyone</button>)}
            <button type="button" className="secondary" onClick={() => void pageRef.current?.requestFullscreen?.()}><Maximize2 size={15} /> Present</button>
            <span className={`pill ${data.published ? 'tone-green' : 'tone-amber'}`}>{data.published ? 'Everyone can see this page' : 'Only you and management can see this page'}</span>
          </div>
        )}
      </header>

      {responses === 0 ? <p className="notice">No answers yet. This page fills in as people send the survey.</p> : (<>
        <section className="results-kpis">
          <div className="card kpi-big">
            <span className="kpi-head"><Users size={18} /> Took part <span lang="ar">· شاركوا</span></span>
            <span className="kpi-hero">{responses}<small> of {people}</small></span>
            <div className="meter" role="img" aria-label={`${Math.min(100, pct(responses, people))} percent took part`}><span style={{ width: `${Math.min(100, pct(responses, people))}%` }} /></div>
            <span className="muted small">{Math.min(100, pct(responses, people))}% of colleagues answered</span>
          </div>
          <div className="card kpi-big">
            <span className="kpi-head"><Award size={18} /> Overall score <span lang="ar">· التقييم العام</span></span>
            <span className="kpi-hero">{company ?? '—'}<small> / 10</small></span>
            <Verdict avg={company} />
            <span className="muted small">Average of how departments rate each other</span>
          </div>
          <div className="card kpi-big">
            <span className="kpi-head"><Lightbulb size={18} /> Ideas shared <span lang="ar">· أفكار</span></span>
            <span className="kpi-hero">{data.ideas ?? 0}</span>
            <span className="muted small">The best idea will be rewarded and, where possible, put into action.</span>
          </div>
        </section>

        <section className="results-highlights">
          {best && <div className="card hl hl-good"><ThumbsUp size={18} /><span className="muted small">Top-rated department · الأعلى تقييماً</span><b>{best.info!.emoji} {best.info!.name}</b><span>{best.avg} / 10</span></div>}
          {worst && <div className="card hl hl-bad"><ThumbsDown size={18} /><span className="muted small">Needs the most support · محتاج دعم أكتر</span><b>{worst.info!.emoji} {worst.info!.name}</b><span>{worst.avg} / 10</span></div>}
          {data.problems?.[0] && <div className="card hl hl-bad"><AlertTriangle size={18} /><span className="muted small">Biggest problem · أكبر مشكلة</span><b dir="auto">{data.problems[0].text}</b><span>said by {data.problems[0].count} people</span></div>}
          {data.strengths?.[0] && <div className="card hl hl-good"><CheckCircle2 size={18} /><span className="muted small">Biggest strength · أكبر ميزة</span><b dir="auto">{data.strengths[0].text}</b><span>said by {data.strengths[0].count} people</span></div>}
        </section>

        <section className="card">
          <h2>How each department is rated <span className="ar-title" lang="ar">تقييم الإدارات</span></h2>
          <p className="muted small">Scores from 1 to 10 given by colleagues in <b>other</b> departments — a team’s score of itself is not counted. Shown once 3 or more people have rated a department.</p>
          <ol className="dept-rank">
            {shown.map((d) => (
              <li key={d.key} title={`${d.info!.name}: ${d.avg} out of 10, from ${d.n} people`}>
                <span className="dept-rank-name"><span className="dept-emoji-sm">{d.info!.emoji}</span><span><b>{d.info!.name}</b><span className="muted small block" lang="ar">{d.info!.ar}</span></span></span>
                <span className="dept-rank-bar"><span style={{ width: `${(d.avg! / 10) * 100}%` }} /></span>
                <span className="dept-rank-score"><b>{d.avg}</b><span className="muted small"> / 10</span></span>
                <span className="dept-rank-meta"><Verdict avg={d.avg} /><span className="muted small">{d.n} ratings</span></span>
              </li>
            ))}
          </ol>
          {waiting.length > 0 && <p className="muted small">Waiting for more ratings: {waiting.map((d) => d.name).join(', ')}.</p>}
        </section>

        <section className="results-two">
          <div className="card">
            <h2><ThumbsDown size={18} /> Biggest problems <span className="ar-title" lang="ar">أكبر المشاكل</span></h2>
            <CountList items={data.problems ?? []} total={responses} empty="Shown once 2 or more people give the same answer." />
          </div>
          <div className="card">
            <h2><ThumbsUp size={18} /> What we do best <span className="ar-title" lang="ar">أحسن مميزاتنا</span></h2>
            <CountList items={data.strengths ?? []} total={responses} empty="Shown once 2 or more people give the same answer." />
          </div>
        </section>

        <section>
          <h2 className="section-title"><Crown size={18} /> The best at TotalCare <span className="ar-title" lang="ar">الأحسن في TotalCare</span></h2>
          <p className="muted small">3 points for a first choice, 2 for second, 1 for third.</p>
          <div className="results-three">
            <Podium title="Best department" arTitle="أحسن إدارة" items={data.best_departments ?? []} dept />
            <Podium title="Best manager" arTitle="أحسن مدير" items={data.best_managers ?? []} />
            <Podium title="Best employee" arTitle="أحسن موظف" items={data.best_employees ?? []} />
          </div>
        </section>

        <section>
          <h2 className="section-title"><MessageSquareQuote size={18} /> What colleagues say about each department <span className="ar-title" lang="ar">رأي الزملاء في كل إدارة</span></h2>
          <div className="dept-say-grid">
            {shown.map((d) => (
              <div key={d.key} className="card dept-say" style={{ ['--c' as string]: d.info!.color }}>
                <h3>{d.info!.emoji} {d.info!.name} <span className="muted small" lang="ar">· {d.info!.ar}</span> <span className="dept-say-score">{d.avg}</span></h3>
                <p className="say-label good"><ThumbsUp size={13} /> Strengths · مميزات</p>
                <CountList items={d.strengths} total={d.n} empty="No answer given by 2+ people yet." />
                <p className="say-label bad"><ThumbsDown size={13} /> To improve · محتاج تحسين</p>
                <CountList items={d.weaknesses} total={d.n} empty="No answer given by 2+ people yet." />
              </div>
            ))}
          </div>
        </section>
      </>)}

      <p className="results-privacy muted small"><ShieldCheck size={14} /> How we keep this anonymous: no names are shown with answers, a department’s score needs 3+ ratings, a written answer appears only if 2+ people gave it, and ideas are never shown here. · محدش يقدر يعرف مين قال إيه.</p>
    </div>
  )
}
