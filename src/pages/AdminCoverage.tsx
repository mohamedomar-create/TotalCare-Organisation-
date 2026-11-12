import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Copy, Megaphone, MessageCircle, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useDirectory } from '../lib/useDirectory'
import { MY_DEPARTMENT_EXTRA, SURVEY_DEPARTMENTS } from '../lib/survey'
import type { Profile } from '../lib/types'

const INVITE_AR = 'زمايلنا في TotalCare 👋 لسه فاضل وقت للاستبيان! افتح لينك الدعوة الخاص بيك اللي وصلك على واتساب (أو سجّل بإيميل الشركة). حوالي ١٠ دقايق وتقدر تبعته من غير اسمك. أحسن فكرة هيتم مكافأتها وتنفيذها.'
const INVITE_EN = 'Dear TotalCare team, there is still time to answer the survey! Open your personal invitation link (sent to you on WhatsApp), or sign in with your company e-mail. About 10 minutes, and you can send it anonymously. The best idea will be rewarded and implemented.'

interface Completion { invited: number; joined: number; sent: number; in_progress: number }

export default function AdminCoverage() {
  // Counts and names only: survey admins can use this page without seeing any answers.
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [counts, setCounts] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const { departments, people } = useDirectory()
  const [participants, setParticipants] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState('')
  const [completion, setCompletion] = useState<Completion | null>(null)

  useEffect(() => {
    void Promise.all([
      supabase.from('profiles').select('*'),
      supabase.rpc('survey_dept_counts'),
      supabase.rpc('survey_participants'),
      supabase.rpc('survey_completion'),
    ]).then(([p, c, part, comp]) => {
      setCompletion((comp.data ?? null) as Completion | null)
      setProfiles((p.data ?? []) as Profile[])
      setCounts(new Map(((c.data ?? []) as { dept: string; answers: number }[]).map((r) => [r.dept, Number(r.answers)])))
      setParticipants(new Set(((part.data ?? []) as { user_id: string }[]).map((r) => r.user_id)))
      setLoading(false)
    })
  }, [])

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const link = origin
  const message = `${INVITE_AR}\n\n${INVITE_EN}\n\n${link}`
  const deptName = useMemo(() => new Map(departments.map((d) => [d.id, d.name.toLowerCase()])), [departments])

  // Headcount per survey department, matched by department name in the directory.
  const rows = [...SURVEY_DEPARTMENTS, ...MY_DEPARTMENT_EXTRA].map((d) => {
    const answered = counts.get(d.key) ?? 0
    const headcount = people.filter((p) => p.department_id && deptName.get(p.department_id) === d.name.toLowerCase()).length
    return { ...d, answered, headcount, pct: headcount ? Math.min(100, Math.round((answered / headcount) * 100)) : null }
  })
  const notGiven = counts.get('') ?? 0
  const missing = profiles.filter((p) => p.active !== false && !participants.has(p.id))

  function copy(text: string, what: string) {
    void navigator.clipboard?.writeText(text)
    setCopied(what)
  }

  if (loading) return <div className="page"><p className="muted">Loading…</p></div>
  return (
    <div className="page wide">
      <h1>Coverage <span className="ar-title" lang="ar">المشاركة</span></h1>
      <p className="muted">Make sure every team and every function is heard. Departments come from each person’s answer; headcount comes from the people directory.</p>

      {completion && (() => {
        // Out of everyone invited (or, before invitations exist, everyone who joined).
        const base = Math.max(completion.invited, completion.joined, completion.sent)
        const pct = base ? Math.min(100, Math.round((completion.sent / base) * 100)) : 0
        const started = base ? Math.min(100 - pct, Math.round((completion.in_progress / base) * 100)) : 0
        return (
          <section className="card completion-card">
            <div className="completion-main">
              <span className="kpi-head"><CheckCircle2 size={18} /> Completed · اكتمل</span>
              <span className="completion-pct">{pct}%</span>
              <span className="muted">{completion.sent} of {base} people sent the survey</span>
            </div>
            <div className="completion-bar" role="img" aria-label={`${pct}% sent, ${started}% in progress`}>
              <span className="sent" style={{ width: `${pct}%` }} />
              <span className="started" style={{ width: `${started}%` }} />
            </div>
            <div className="completion-legend">
              <span><i className="sent" /> Sent · اتبعت <b>{completion.sent}</b></span>
              <span><i className="started" /> Started, not sent · بدأ ومبعتش <b>{completion.in_progress}</b></span>
              <span><i className="todo" /> Not started · لسه <b>{Math.max(0, base - completion.sent - completion.in_progress)}</b></span>
              <span className="muted">Invited <b>{completion.invited}</b> · joined <b>{completion.joined}</b></span>
            </div>
          </section>
        )
      })()}

      <div className="two-col">
        <section className="card">
          <h2><Users size={18} /> Answers by department</h2>
          <table className="coverage-table">
            <thead><tr><th>Department</th><th>Answers</th><th>People</th><th>Coverage</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td>{r.name} <span className="muted small" lang="ar">· {r.ar}</span></td>
                  <td>{r.answered}</td>
                  <td>{r.headcount || '—'}</td>
                  <td>{r.pct === null ? <span className="muted small">add people to the directory</span> : (
                    <span className="coverage-bar"><span style={{ width: `${r.pct}%`, background: r.pct >= 70 ? '#16a34a' : r.pct >= 40 ? '#d97706' : '#dc2626' }} /><b>{r.pct}%</b></span>
                  )}</td>
                </tr>
              ))}
              <tr><td className="muted">Department not given</td><td>{notGiven}</td><td /><td /></tr>
            </tbody>
          </table>
          <p className="muted small">Aim for 70%+ in every department. Below 3 answers, a department’s own results stay merged so nobody can be identified.</p>
        </section>

        <section className="card">
          <h2><Megaphone size={18} /> Remind everyone</h2>
          <p className="muted small">Most field staff read WhatsApp first. Send this to department groups — it says the survey can be anonymous.</p>
          <pre className="invite" dir="auto">{message}</pre>
          <div className="row">
            <a className="button" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer"><MessageCircle size={15} /> Share on WhatsApp</a>
            <button type="button" className="secondary" onClick={() => copy(message, 'invite')}><Copy size={15} /> {copied === 'invite' ? 'Copied' : 'Copy message'}</button>
          </div>
          <p className="notice small">This is a reminder only — it doesn’t let anyone in. Each person joins with their own one-time invitation from <Link to="/admin/invitations">Invitations</Link>, so the number of answers can never exceed the number of employees you invited.</p>
        </section>
      </div>

      <section className="card">
        <div className="row between">
          <h2>Not answered yet ({missing.length} of {profiles.filter((p) => p.active !== false).length})</h2>
          {missing.length > 0 && <button type="button" className="secondary small-btn" onClick={() => copy(missing.map((p) => p.full_name || p.email).join('\n'), 'names')}><Copy size={14} /> {copied === 'names' ? 'Copied' : 'Copy names'}</button>}
        </div>
        <p className="muted small">Only who has taken part is known — never what they answered, and never which answers were anonymous. Use this for friendly reminders, not pressure.</p>
        <div className="chips static">
          {missing.map((p) => <span key={p.id} className="chip"><span className="chip-text">{p.full_name || p.email}</span></span>)}
        </div>
      </section>
    </div>
  )
}
