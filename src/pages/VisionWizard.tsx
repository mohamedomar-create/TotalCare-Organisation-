import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, Copy, EyeOff, Gift, Lock, Send, Trash2, UserRound, Users, WifiOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useDirectory } from '../lib/useDirectory'
import type { Submission } from '../lib/types'
import {
  MY_DEPARTMENT_EXTRA,
  PROBLEM_SUGGESTIONS,
  STRENGTH_SUGGESTIONS,
  SURVEY_DEPARTMENTS,
  WIZARD_STEPS,
  type DeptReview,
  type SurveyAnswers,
} from '../lib/survey'
import { assessQuality, missingAnswers, newRewardCode, qualityRecord, type Issue } from '../lib/quality'
import PrivacyNotice from '../components/PrivacyNotice'
import SubmissionSummary from '../components/SubmissionSummary'
import SurveySummary from '../components/survey/SurveySummary'
import { DeptReviewer, NumberedList, RewardBanner, TopThreeDepartments, TopThreeNames } from '../components/survey/SurveyParts'

const LAST = WIZARD_STEPS.length - 1

const isNetworkError = (m: string) => /failed to fetch|networkerror|load failed|network request failed|fetch failed/i.test(m) || !navigator.onLine

function readBackup(key: string): Partial<Submission> | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as Partial<Submission>) : null
  } catch {
    return null
  }
}
function writeBackup(key: string, patch: Partial<Submission>) {
  try {
    localStorage.setItem(key, JSON.stringify(patch))
  } catch {
    /* storage full or blocked: the in-memory copy still retries */
  }
}
function clearBackup(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export default function VisionWizard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { departments } = useDirectory()
  const [deptIndex, setDeptIndex] = useState(0)
  const [copied, setCopied] = useState(false)
  const [sub, setSub] = useState<Submission | null>(null)
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null) // could not open the draft at all
  const [saveError, setSaveError] = useState<string | null>(null) // a save failed; work is kept and retried
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'dirty' | 'offline'>('saved')
  const [done, setDone] = useState<false | 'named' | 'anonymous'>(false)
  const [anonymous, setAnonymous] = useState<boolean | null>(null)
  const [tried, setTried] = useState(-1) // the step where Next was pressed with answers missing
  const pending = useRef<Partial<Submission>>({})
  const timer = useRef<number | undefined>(undefined)
  const inFlight = useRef<Promise<boolean> | null>(null)
  const retries = useRef(0)
  const backupKey = `tc-draft-${id}`

  useEffect(() => {
    supabase
      .from('submissions')
      .select('*')
      .eq('id', id!)
      .single()
      .then(({ data, error }) => {
        if (error) return setError(isNetworkError(error.message) ? 'No connection. Check your internet and reload the page.' : error.message)
        let s = data as Submission
        // Changes that could not reach the server last time are kept on this device; put them back.
        const backup = readBackup(backupKey)
        if (backup && s.status === 'draft') {
          s = { ...s, ...backup }
          pending.current = backup
          setSaveState('dirty')
          timer.current = window.setTimeout(() => void flush(), 500)
        }
        setSub(s)
        // Reopen at the furthest step reached, but never past the first question still unanswered.
        const gaps = missingAnswers((s.answers ?? {}) as SurveyAnswers)
        const firstGap = gaps.length ? Math.min(...gaps.map((i) => i.step)) : LAST
        setStep(s.status === 'submitted' ? LAST : Math.min(s.current_step ?? 0, firstGap, LAST))
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Warn before leaving with unsaved changes; retry as soon as the connection comes back.
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (Object.keys(pending.current).length) e.preventDefault()
    }
    const onOnline = () => void flush()
    window.addEventListener('beforeunload', onUnload)
    window.addEventListener('online', onOnline)
    return () => {
      window.removeEventListener('beforeunload', onUnload)
      window.removeEventListener('online', onOnline)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const deptName = useMemo(() => new Map(departments.map((d) => [d.id, d.name])), [departments])
  const locked = sub?.status === 'submitted'

  // One save at a time; failed saves are merged back and retried with growing delays.
  async function flush(): Promise<boolean> {
    window.clearTimeout(timer.current)
    if (inFlight.current) {
      await inFlight.current
      if (!Object.keys(pending.current).length) return true
    }
    const patch = pending.current
    pending.current = {}
    if (Object.keys(patch).length === 0) return true
    setSaveState('saving')
    const run = (async () => {
      let message: string | null = null
      try {
        const { error } = await supabase.from('submissions').update(patch).eq('id', id!)
        message = error?.message ?? null
      } catch (e) {
        message = String(e)
      }
      if (message) {
        pending.current = { ...patch, ...pending.current }
        writeBackup(backupKey, pending.current)
        const offline = isNetworkError(message)
        setSaveState(offline ? 'offline' : 'dirty')
        setSaveError(offline ? 'Connection lost — your work is kept on this device and will be saved automatically.' : `Could not save: ${message}`)
        retries.current += 1
        timer.current = window.setTimeout(() => void flush(), Math.min(30000, 1000 * 2 ** retries.current))
        return false
      }
      retries.current = 0
      setSaveError(null)
      if (Object.keys(pending.current).length) {
        writeBackup(backupKey, pending.current)
        setSaveState('dirty')
      } else {
        clearBackup(backupKey)
        setSaveState('saved')
      }
      return true
    })()
    inFlight.current = run
    const ok = await run
    inFlight.current = null
    return ok
  }

  function change(patch: Partial<Submission>) {
    if (locked) return
    // Remember when answering started, to spot answers given too fast to be read.
    if (!sub?.answers?.started_at && !patch.answers?.started_at) patch = { ...patch, answers: { ...(sub?.answers ?? {}), ...(patch.answers ?? {}), started_at: new Date().toISOString() } }
    setSub((s) => (s ? { ...s, ...patch } : s))
    pending.current = { ...pending.current, ...patch }
    writeBackup(backupKey, pending.current)
    setSaveState((v) => (v === 'offline' ? v : 'dirty'))
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => void flush(), 1000)
  }

  function go(next: number) {
    const target = Math.max(0, Math.min(LAST, next))
    setStep(target)
    if (!locked && sub && target > (sub.current_step ?? 0)) change({ current_step: target })
    void flush()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function submit() {
    if (!sub) return
    if (anonymous === null) return setSaveError('Choose how to send your answers: with your name or anonymously.')
    const a = (sub.answers ?? {}) as SurveyAnswers
    const q = assessQuality(a, profile?.full_name ?? '')
    if (missingAnswers(a).length || q.open.some((i) => i.severity === 'hard')) return setSaveError('Please answer every question and fix the points marked in red first.')
    // An anonymous author keeps a code to claim the best-idea reward; nobody else can link it to them.
    const hasIdeas = [...(a.company_ideas ?? []), ...Object.values(a.depts ?? {}).map((r) => r.ideas ?? '')].some((t) => t?.trim())
    if (anonymous && hasIdeas && !a.reward_code) change({ answers: { ...a, reward_code: newRewardCode() } })
    if (!(await flush())) return
    let message: string | null = null
    try {
      const { error } = await supabase.rpc('submit_survey', { p_id: id!, p_anonymous: anonymous, p_quality: qualityRecord(q) })
      message = error?.message ?? null
    } catch (e) {
      message = String(e)
    }
    if (message) return setSaveError(isNetworkError(message) ? 'No connection — please check your internet and press Send again. Nothing was lost.' : `Could not send: ${message}`)
    clearBackup(backupKey)
    setSub((s) => (s ? { ...s, status: 'submitted' } : s))
    setDone(anonymous ? 'anonymous' : 'named')
  }

  async function remove() {
    if (!confirm('Delete this draft? This cannot be undone.')) return
    window.clearTimeout(timer.current)
    pending.current = {}
    const { error } = await supabase.from('submissions').delete().eq('id', id!)
    if (error) return setSaveError(isNetworkError(error.message) ? 'No connection — try deleting again in a moment.' : error.message)
    clearBackup(backupKey)
    navigate(profile?.role === 'staff' ? '/' : '/vision')
  }

  if (error) return <div className="page"><p className="error">{error}</p><button type="button" onClick={() => location.reload()}>Try again</button></div>
  if (!sub) return <div className="page"><p className="muted">Loading…</p></div>

  const answers = (sub.answers ?? {}) as SurveyAnswers
  // Surveys started before the department survey keep their original screens, read-only.
  if (answers.v !== 2 && sub.status === 'submitted') {
    return (
      <div className="page wizard">
        <Link to="/vision" className="link"><ArrowLeft size={15} /> My survey</Link>
        <h1>Your earlier answers <span className="ar-title" lang="ar">إجاباتك السابقة</span></h1>
        <SubmissionSummary sub={sub} departmentName={sub.department_id ? deptName.get(sub.department_id) : undefined} />
      </div>
    )
  }

  if (done) {
    const code = answers.reward_code
    return (
      <div className="page narrow-page center-text">
        <div className="card success-card">
          <CheckCircle2 size={56} className="success-icon" />
          <h1>Thank you! · شكراً</h1>
          {done === 'anonymous' ? (
            <p>Your answers were sent <b>anonymously</b>. They are stored with no name, so they no longer appear under your account — that’s how we keep them anonymous.</p>
          ) : (
            <p>Your answers were sent. Only the project admin can see your name; management sees summaries without names.</p>
          )}
          {done === 'anonymous' && code && (
            <div className="reward-code">
              <Gift size={22} />
              <p><b>Your idea reward code · كود مكافأة الفكرة</b></p>
              <p className="case-code">{code}</p>
              <button type="button" className="secondary" onClick={() => { void navigator.clipboard?.writeText(code); setCopied(true) }}><Copy size={15} /> {copied ? 'Copied' : 'Copy'}</button>
              <p className="muted small">If your idea wins, we’ll announce this code. Show it to claim your reward — it’s the only link between you and your idea. Take a screenshot now.</p>
              <p className="muted small" lang="ar" dir="rtl">لو فكرتك كسبت هنعلن الكود ده. صوّره دلوقتي علشان تستلم مكافأتك.</p>
            </div>
          )}
          <p className="muted">Results and the initiatives that come out of them will be shared with everyone.</p>
          <div className="row center">
            <Link className="button" to="/">Back to home</Link>
            {profile?.role !== 'staff' && <Link className="button secondary" to="/initiatives">You said, we did</Link>}
          </div>
        </div>
      </div>
    )
  }

  const setAnswers = (patch: Partial<SurveyAnswers>) => change({ answers: { ...answers, ...patch, v: 2 } })
  const setDept = (key: string, r: DeptReview) => setAnswers({ depts: { ...(answers.depts ?? {}), [key]: r } })
  const quality = assessQuality(answers, profile?.full_name ?? '')
  // Every question is required: missing answers come first, then the consistency checks.
  const missing = missingAnswers(answers)
  const hardOpen = [...missing, ...quality.open.filter((i) => i.severity === 'hard' && !missing.some((m) => m.key === i.key))]
  const firstGap = missing.length ? Math.min(...missing.map((i) => i.step)) : LAST
  const stepMissing = missing.filter((i) => i.step === step)
  const fix = (i: Issue) => {
    if (i.dept) setDeptIndex(Math.max(0, SURVEY_DEPARTMENTS.findIndex((d) => d.key === i.dept)))
    go(i.step)
  }
  function next() {
    if (stepMissing.length) {
      setTried(step)
      window.setTimeout(() => document.querySelector('.missing-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
      const first = stepMissing[0]
      if (first.dept) setDeptIndex(Math.max(0, SURVEY_DEPARTMENTS.findIndex((d) => d.key === first.dept)))
      return
    }
    setTried(-1)
    go(step + 1)
  }
  const softOpen = quality.open.filter((i) => i.severity === 'soft')
  const progress = Math.round((step / LAST) * 100)
  const myDeptChoices = [...SURVEY_DEPARTMENTS, ...MY_DEPARTMENT_EXTRA]

  function chooseMyDept(key: string) {
    const name = myDeptChoices.find((d) => d.key === key)?.name.toLowerCase()
    // Also link the matching directory department, so the older reports keep working.
    const match = departments.find((d) => d.name.toLowerCase() === name)
    change({ answers: { ...answers, my_dept: key, v: 2 }, department_id: match?.id ?? null })
  }

  return (
    <div className="page wizard">
      <div className="wizard-head">
        <div className="row between">
          <Link to={profile?.role === 'staff' ? '/' : '/vision'} className="link"><ArrowLeft size={15} /> {profile?.role === 'staff' ? 'Home' : 'My survey'}</Link>
          <span className="muted small save-state">
            {locked ? <><Lock size={13} /> Sent {sub.submitted_at && new Date(sub.submitted_at).toLocaleDateString()}</> : saveState === 'saved' ? <><Check size={13} /> Saved</> : saveState === 'saving' ? 'Saving…' : saveState === 'offline' ? <><WifiOff size={13} /> Offline — kept on this device</> : 'Unsaved changes'}
          </span>
        </div>
        {saveError && (
          <div className="save-banner" role="status">
            <WifiOff size={16} /> <span className="grow">{saveError}</span>
            <button type="button" className="small-btn secondary" onClick={() => { retries.current = 0; setSaveError(null); void flush() }}>Retry now</button>
          </div>
        )}
        <div className="progress"><div className="progress-bar" style={{ width: `${progress}%` }} /></div>
        <ol className="stepper">
          {WIZARD_STEPS.map((s, i) => (
            <li key={s.key} className={i === step ? 'current' : i < step || locked ? 'done' : ''}>
              <button type="button" onClick={() => go(i)} disabled={locked ? i !== LAST : i > firstGap} title={!locked && i > firstGap ? 'Answer the earlier questions first · جاوب الأسئلة اللي قبلها الأول' : undefined}>
                <span className="step-num">{i < step || locked ? <Check size={13} /> : i + 1}</span>
                <span className="step-title">{s.title}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="wizard-step">
        <p className="step-kicker">Step {step + 1} of {WIZARD_STEPS.length} · {WIZARD_STEPS[step].hint} · <span lang="ar">{WIZARD_STEPS[step].ar}</span></p>

        {step === 0 && (
          <>
            <h1>Which department are you in? <span className="ar-title" lang="ar">إنت في أنهي إدارة؟</span></h1>
            <PrivacyNotice />
            <p className="lead">That’s the only thing we ask about you. It lets us leave out a team’s rating of itself. · ده السؤال الوحيد عنك.</p>
            <div className="chips big-chips">
              {myDeptChoices.map((d) => (
                <button key={d.key} type="button" className={`chip ${answers.my_dept === d.key ? 'on' : ''}`} onClick={() => chooseMyDept(d.key)}>
                  <span className="chip-text">{d.name}<span className="chip-ar" lang="ar">{d.ar}</span></span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1>Rate each department <span className="ar-title" lang="ar">قيّم كل إدارة</span></h1>
            <p className="lead">For each of the 8 departments: your score from 1 to 10, its biggest strengths, its biggest weaknesses and one idea to improve it. All questions are required. · كل الأسئلة إجبارية.</p>
            <DeptReviewer depts={answers.depts ?? {}} myDept={answers.my_dept} index={deptIndex} onIndex={setDeptIndex} onChange={setDept} />
          </>
        )}

        {step === 2 && (
          <>
            <h1>The best at TotalCare <span className="ar-title" lang="ar">الأحسن في TotalCare</span></h1>
            <p className="lead">Your top 3 in each — all three are required. Write each person’s full name. You can’t choose yourself, and each name only once.</p>
            <TopThreeNames title="Best manager" ar="أحسن مدير" value={answers.best_managers ?? []} onChange={(v) => setAnswers({ best_managers: v })} />
            <TopThreeDepartments value={answers.best_departments ?? []} onChange={(v) => setAnswers({ best_departments: v })} />
            <TopThreeNames title="Best employee" ar="أحسن موظف" icon={<Users size={18} />} value={answers.best_employees ?? []} onChange={(v) => setAnswers({ best_employees: v })} />
          </>
        )}

        {step === 3 && (
          <>
            <h1>The company <span className="ar-title" lang="ar">الشركة</span></h1>
            <p className="lead">Three of each, all required. Short answers are best. Tap a suggestion if it says what you mean — it helps us count similar answers together.</p>
            <NumberedList title="Biggest company problems" ar="أكبر مشاكل الشركة" count={3} value={answers.company_problems ?? []} onChange={(v) => setAnswers({ company_problems: v })} suggestions={PROBLEM_SUGGESTIONS} placeholder="e.g. Approvals take too long" />
            <NumberedList title="Best company strengths" ar="أحسن مميزات الشركة" count={3} value={answers.company_strengths ?? []} onChange={(v) => setAnswers({ company_strengths: v })} suggestions={STRENGTH_SUGGESTIONS} placeholder="e.g. Hospitals trust us" />
          </>
        )}

        {step === 4 && (
          <>
            <h1>Ideas to develop TotalCare <span className="ar-title" lang="ar">أفكار ممكن تطوّر الشركة</span></h1>
            <RewardBanner />
            <p className="lead">Write 5 ideas — all five are required. · اكتب ٥ أفكار.</p>
            <NumberedList title="Your ideas" ar="أفكارك" count={5} value={answers.company_ideas ?? []} onChange={(v) => setAnswers({ company_ideas: v })} placeholder="e.g. One approval matrix: max 2 signatures for any order" />
          </>
        )}

        {step === LAST && (
          <>
            <h1>{locked ? 'Your answers' : 'Check and send'} <span className="ar-title" lang="ar">{locked ? 'إجاباتك' : 'راجع وابعت'}</span></h1>
            {!locked && hardOpen.length > 0 && (
              <div className="card check-card hard">
                <h3><AlertTriangle size={18} /> Please fix · لازم تتعدل</h3>
                {hardOpen.map((i) => (
                  <div key={i.key} className="check-row">
                    <span className="grow">{i.message}<br /><span className="muted small" lang="ar">{i.ar}</span></span>
                    <button type="button" className="secondary small-btn" onClick={() => fix(i)}>Fix</button>
                  </div>
                ))}
              </div>
            )}
            {!locked && softOpen.length > 0 && (
              <div className="card check-card">
                <h3><AlertTriangle size={18} /> Quick double-check · تأكيد سريع</h3>
                <p className="muted small">These answers don’t seem to fit together. Change them, or tell us they’re right.</p>
                {softOpen.map((i) => (
                  <div key={i.key} className="check-row">
                    <span className="grow">{i.message}<br /><span className="muted small" lang="ar">{i.ar}</span></span>
                    <button type="button" className="secondary small-btn" onClick={() => { if (i.dept) setDeptIndex(Math.max(0, SURVEY_DEPARTMENTS.findIndex((d) => d.key === i.dept))); go(i.step) }}>Change</button>
                    <button type="button" className="link" onClick={() => setAnswers({ confirmed: [...(answers.confirmed ?? []), i.key] })}>It’s right · صح</button>
                  </div>
                ))}
              </div>
            )}
            {!locked && quality.straightLined && <p className="notice small">You gave every department the same score. If that’s how you really see them, fine — otherwise take another look.</p>}
            {!locked && (
              <div className="anon-choice">
                <p className="field-label">How do you want to send it? <span className="ar-inline" lang="ar">عايز تبعتها إزاي؟</span></p>
                <button type="button" className={`card choice ${anonymous === false ? 'on' : ''}`} onClick={() => setAnonymous(false)}>
                  <UserRound size={22} />
                  <span><b>With my name</b> · باسمي<br /><span className="muted small">Only the project admin sees your name and can follow up — and reward your idea directly. Management sees summaries without names.</span></span>
                </button>
                <button type="button" className={`card choice ${anonymous === true ? 'on' : ''}`} onClick={() => setAnonymous(true)}>
                  <EyeOff size={22} />
                  <span><b>Anonymously</b> · من غير اسم<br /><span className="muted small">Stored with no name and only today’s date: nobody, including the admin, can link the answers to you. Only your department is kept with them. You get a private code to claim the reward if your idea wins.</span></span>
                </button>
              </div>
            )}
            <SurveySummary answers={answers} onEdit={locked ? undefined : go} />
          </>
        )}
      </div>

      {!locked && step < LAST && tried === step && stepMissing.length > 0 && (
        <div className="card check-card hard missing-card" role="alert">
          <h3><AlertTriangle size={18} /> Please answer every question · من فضلك جاوب كل الأسئلة</h3>
          {stepMissing.map((i) => (
            <div key={i.key} className="check-row">
              <span className="grow">{i.message}<br /><span className="muted small" lang="ar">{i.ar}</span></span>
              {i.dept && <button type="button" className="secondary small-btn" onClick={() => fix(i)}>Go</button>}
            </div>
          ))}
        </div>
      )}

      {!locked && (
        <div className="wizard-foot">
          <button type="button" className="secondary" onClick={() => go(step - 1)} disabled={step === 0}><ArrowLeft size={16} /> Back</button>
          <button type="button" className="link danger" onClick={remove}><Trash2 size={14} /> Delete draft</button>
          {step < LAST ? (
            <button type="button" onClick={next}>Next <ArrowRight size={16} /></button>
          ) : (
            <button type="button" className="primary-lg" onClick={submit} disabled={anonymous === null || hardOpen.length > 0}><Send size={16} /> {anonymous ? 'Send anonymously · ابعت من غير اسم' : 'Send · ابعت'}</button>
          )}
        </div>
      )}
    </div>
  )
}
