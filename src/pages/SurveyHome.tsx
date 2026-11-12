import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BarChart3, CheckCircle2, ClipboardList, EyeOff, Lock, Rocket, ShieldCheck, Sparkles, Timer, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { createSubmission, useAllowance, useMySubmissions } from '../lib/submissions'
import { WIZARD_STEPS, type SurveyAnswers } from '../lib/survey'
import { missingAnswers } from '../lib/quality'
import type { Submission } from '../lib/types'
import { STATUS, useInitiatives } from '../lib/initiatives'
import { CountUp } from '../components/ui'

/** The step a draft reopens at: as far as it got, but never past the first unanswered question. */
function resumeStep(d: Submission) {
  const gaps = missingAnswers((d.answers ?? {}) as SurveyAnswers)
  const firstGap = gaps.length ? Math.min(...gaps.map((i) => i.step)) : WIZARD_STEPS.length - 1
  return Math.min(d.current_step ?? 0, firstGap, WIZARD_STEPS.length - 1)
}

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

/** surveyOnly: for staff, who see the survey and nothing else. */
export default function SurveyHome({ surveyOnly = false }: { surveyOnly?: boolean }) {
  const { session, profile } = useAuth()
  const navigate = useNavigate()
  const { items } = useMySubmissions(session?.user.id)
  const { allowance, canStart } = useAllowance(session?.user.id)
  const { items: initiatives } = useInitiatives(session?.user.id)
  const [progress, setProgress] = useState<{ responses: number; people: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // When the super admin shares the results, a button to them appears here (not for staff).
  const [resultsOpen, setResultsOpen] = useState(false)
  useEffect(() => {
    if (surveyOnly) return // invited people see the survey and nothing else
    supabase.rpc('results_summary').then(({ data }) => setResultsOpen(Boolean((data as { allowed?: boolean; published?: boolean } | null)?.published && (data as { allowed?: boolean }).allowed)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    supabase.rpc('survey_progress').then(({ data }) => {
      const row = (Array.isArray(data) ? data[0] : data) as { responses: number; people: number } | null
      if (row) setProgress({ responses: Number(row.responses), people: Number(row.people) })
    })
  }, [])

  const draft = items.find((s) => s.status === 'draft')
  // Anonymous answers leave no row the person can see; the allowance shows they took part.
  const sent = items.some((s) => s.status === 'submitted') || (!draft && Boolean(allowance && allowance.used > 0))
  const firstName = (profile?.full_name || '').split(' ')[0]
  const pct = progress && progress.people ? Math.round((progress.responses / progress.people) * 100) : 0
  const live = initiatives.filter((i) => i.visible && i.status !== 'proposed' && i.status !== 'parked').slice(0, 3)

  async function start() {
    try {
      if (draft) return navigate(`/vision/${draft.id}`)
      if (!canStart) return surveyOnly ? setError('You have already sent your answers. Thank you! · إجاباتك وصلت، شكراً') : navigate('/vision')
      navigate(`/vision/${await createSubmission()}`)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div className="page wide home">
      <section className="home-hero survey-hero">
        <div className="hero-orbs" aria-hidden="true"><span /><span /><span /></div>
        <div className="home-hero-inner">
          <div className="grow">
            <p className="hero-kicker">TotalCare Egypt · People survey {new Date().getFullYear()}</p>
            <h1>{greeting()}{firstName ? `, ${firstName}` : ''} 👋</h1>
            <p className="hero-ar" lang="ar">صوتك بيشكّل TotalCare. قول رأيك بصراحة وبأمان.</p>
            <p className="hero-sub">
              Tell us honestly how work feels and what slows you down. About <b>10 minutes</b>, simple English or Arabic, and you choose whether your name is attached.
            </p>
            {sent && !draft ? (
              <div className="sent-banner"><CheckCircle2 size={20} /> Thank you — your answers are in. <span lang="ar">شكراً، رأيك وصل.</span></div>
            ) : (
              <button type="button" className="hero-cta big" onClick={start}>
                <ClipboardList size={18} /> {draft ? `Continue — step ${resumeStep(draft) + 1} of ${WIZARD_STEPS.length} · كمّل` : 'Start the survey · ابدأ الاستبيان'} <ArrowRight size={18} />
              </button>
            )}
            {resultsOpen && <Link className="button secondary hero-results" to="/results"><BarChart3 size={18} /> See the results · شوف النتايج</Link>}
            {error && <p className="error">{error}</p>}
          </div>
          <div className="me-card participation">
            <Users size={22} />
            <strong>{progress ? <CountUp value={pct} /> : '—'}%</strong>
            <small>of colleagues have answered</small>
            <div className="level-bar"><span style={{ width: `${pct}%` }} /></div>
            <small>{progress ? `${progress.responses} of ${progress.people}` : ''}</small>
            <small lang="ar">نسبة المشاركة</small>
          </div>
        </div>
      </section>

      <section className="how-grid">
        <div className="card how">
          <EyeOff size={22} />
          <strong>Answer anonymously if you want</strong>
          <span className="muted small">Choose “Send anonymously” at the end. Your answers are stored with no name and no time, so nobody — not even the admin — can link them to you.</span>
          <span className="muted small" lang="ar" dir="rtl">تقدر تبعت من غير اسم، ومحدش يقدر يعرف إنها إجابتك.</span>
        </div>
        <div className="card how">
          <ShieldCheck size={22} />
          <strong>Small teams are protected</strong>
          <span className="muted small">Management only sees results for groups of 3 or more people. Smaller teams are combined so no one stands out.</span>
          <span className="muted small" lang="ar" dir="rtl">الإدارة بتشوف نتايج المجموعات من ٣ أشخاص وأكتر بس.</span>
        </div>
        <div className="card how">
          <Timer size={22} />
          <strong>Simple and smart</strong>
          <span className="muted small">Rate each department from 1 to 10 and pick answers from the lists. If two answers don’t fit together, we’ll ask you once to double-check.</span>
          <span className="muted small" lang="ar" dir="rtl">قيّم كل إدارة من ١ لـ ١٠ واختار من القوائم. لو في إجابتين مش راكبين على بعض هنسألك تتأكد.</span>
        </div>
      </section>

      <section className="card journey-card">
        <h2><Sparkles size={18} /> What happens after you answer</h2>
        <ol className="journey-steps">
          <li><b>1. You answer</b><span>About 10 minutes, Arabic or English</span><span lang="ar">بتجاوب</span></li>
          <li><b>2. Results shared</b><span>A summary for everyone — no names</span><span lang="ar">النتايج بتتنشر</span></li>
          <li><b>3. Initiatives</b><span>Each with an owner, a target and a deadline</span><span lang="ar">مبادرات بمسؤول وهدف وميعاد</span></li>
          <li><b>4. You see progress</b><span>Updates shared with everyone</span><span lang="ar">بتشوف التقدم</span></li>
        </ol>
      </section>

      {!surveyOnly && <div className="two-col">
        <Link to="/speak-up" className="card link-card speak-card">
          <div>
            <strong><Lock size={16} /> Speak up safely · قول رأيك بأمان</strong>
            <p className="muted small">Something serious or sensitive — a manager, harassment, gifts in tenders, safety? Send it with no name. You get a case code to read the reply.</p>
          </div>
          <ArrowRight size={18} />
        </Link>
        <Link to="/initiatives" className="card link-card">
          <div>
            <strong><Rocket size={16} /> You said, we did · قلتوا وعملنا</strong>
            {live.length === 0 ? (
              <p className="muted small">Initiatives from the survey will appear here with their progress.</p>
            ) : (
              <ul className="mini-initiatives">
                {live.map((i) => (
                  <li key={i.id}>
                    <span className="grow">{i.title}</span>
                    <span className={`pill tone-${STATUS[i.status].tone}`}>{i.progress}%</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <ArrowRight size={18} />
        </Link>
      </div>}
    </div>
  )
}
