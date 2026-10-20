import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Lock, Send, Trash2, WifiOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useDirectory } from '../lib/useDirectory'
import type { Submission } from '../lib/types'
import {
  CHALLENGE_OPTIONS,
  MAX_CHALLENGES,
  RATING_DIMENSIONS,
  RESPONSIBILITY_OPTIONS,
  ROLE_LEVELS,
  ARABIC,
  WIZARD_STEPS,
} from '../lib/survey'
import Chips from '../components/Chips'
import RatingRow from '../components/RatingRow'
import OrgBoardEditor from '../components/board/OrgBoardEditor'
import { asBoard } from '../lib/orgBoard'
import SubmissionSummary from '../components/SubmissionSummary'
import PrivacyNotice from '../components/PrivacyNotice'

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
  const { departments } = useDirectory()
  const [sub, setSub] = useState<Submission | null>(null)
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null) // could not open the draft at all
  const [saveError, setSaveError] = useState<string | null>(null) // a save failed; work is kept and retried
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'dirty' | 'offline'>('saved')
  const [done, setDone] = useState(false)
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
        setStep(s.status === 'submitted' ? LAST : Math.min(s.current_step ?? 0, LAST))
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
    if (!(await flush())) return
    let message: string | null = null
    try {
      const { error } = await supabase.from('submissions').update({ status: 'submitted', current_step: LAST }).eq('id', id!)
      message = error?.message ?? null
    } catch (e) {
      message = String(e)
    }
    if (message) return setSaveError(isNetworkError(message) ? 'No connection — please check your internet and press Send again. Nothing was lost.' : `Could not send: ${message}`)
    clearBackup(backupKey)
    setSub((s) => (s ? { ...s, status: 'submitted' } : s))
    setDone(true)
  }

  async function remove() {
    if (!confirm('Delete this draft? This cannot be undone.')) return
    window.clearTimeout(timer.current)
    pending.current = {}
    const { error } = await supabase.from('submissions').delete().eq('id', id!)
    if (error) return setSaveError(isNetworkError(error.message) ? 'No connection — try deleting again in a moment.' : error.message)
    clearBackup(backupKey)
    navigate('/vision')
  }

  if (error) return <div className="page"><p className="error">{error}</p><button type="button" onClick={() => location.reload()}>Try again</button></div>
  if (!sub) return <div className="page"><p className="muted">Loading…</p></div>

  if (done) {
    return (
      <div className="page narrow-page center-text">
        <div className="card success-card">
          <CheckCircle2 size={56} className="success-icon" />
          <h1>Thank you!</h1>
          <p>Your submission has been sent to the admin. It is now locked, but you can start another one any time.</p>
          <div className="row center">
            <Link className="button" to="/">Back to home</Link>
            <Link className="button secondary" to="/vision">My submissions</Link>
          </div>
        </div>
      </div>
    )
  }

  const board = asBoard(sub.structure)
  const answeredRatings = RATING_DIMENSIONS.filter((d) => sub.ratings?.[d.key]).length
  const progress = Math.round((step / LAST) * 100)

  return (
    <div className={`page wizard ${step === 4 ? 'wide' : ''}`}>
      <div className="wizard-head">
        <div className="row between">
          <Link to="/vision" className="link"><ArrowLeft size={15} /> My submissions</Link>
          <span className="muted small save-state">
            {locked ? <><Lock size={13} /> Submitted {sub.submitted_at && new Date(sub.submitted_at).toLocaleDateString()}</> : saveState === 'saved' ? <><Check size={13} /> Saved</> : saveState === 'saving' ? 'Saving…' : saveState === 'offline' ? <><WifiOff size={13} /> Offline — kept on this device</> : 'Unsaved changes'}
          </span>
        </div>
        {saveError && (
          <div className="save-banner" role="status">
            <WifiOff size={16} /> <span className="grow">{saveError}</span>
            <button type="button" className="small-btn secondary" onClick={() => { retries.current = 0; void flush() }}>Retry now</button>
          </div>
        )}
        <div className="progress"><div className="progress-bar" style={{ width: `${progress}%` }} /></div>
        <ol className="stepper">
          {WIZARD_STEPS.map((s, i) => (
            <li key={s.key} className={i === step ? 'current' : i < step || locked ? 'done' : ''}>
              <button type="button" onClick={() => go(i)} disabled={locked && i !== LAST}>
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
            <h1>Let’s start with you <span className="ar-title" lang="ar">نبدأ بيك</span></h1>
            <PrivacyNotice />
            <p className="field-label">Your department <span className="ar-inline" lang="ar">إدارتك</span></p>
            <div className="chips">
              {departments.map((d) => (
                <button key={d.id} type="button" className={`chip ${sub.department_id === d.id ? 'on' : ''}`} onClick={() => change({ department_id: d.id })} style={sub.department_id === d.id ? { background: d.color, borderColor: d.color } : undefined}>
                  {d.name}
                </button>
              ))}
              <button type="button" className={`chip ${sub.department_id === null ? 'on' : ''}`} onClick={() => change({ department_id: null })}>
                <span className="chip-text">Prefer not to say<span className="chip-ar" lang="ar">أفضّل ألا أقول</span></span>
              </button>
            </div>
            <p className="field-label">Your level <span className="ar-inline" lang="ar">مستواك الوظيفي</span></p>
            <Chips options={ROLE_LEVELS} selected={sub.role_level ? [sub.role_level] : []} onChange={(v) => change({ role_level: v[v.length - 1] ?? '' })} translate={ARABIC} />
          </>
        )}

        {step === 1 && (
          <>
            <h1>How is work going? <span className="ar-title" lang="ar">الشغل ماشي إزاي؟</span></h1>
            <p className="lead">Tap one face for each line. {answeredRatings} of {RATING_DIMENSIONS.length} done.</p>
            {RATING_DIMENSIONS.map((d) => (
              <RatingRow key={d.key} question={d.question} ar={d.ar} value={sub.ratings?.[d.key]} onChange={(v) => change({ ratings: { ...sub.ratings, [d.key]: v } })} />
            ))}
          </>
        )}

        {step === 2 && (
          <>
            <h1>What do you do? <span className="ar-title" lang="ar">بتعمل إيه؟</span></h1>
            <p className="lead">Tap everything that is part of your work. Add your own if it’s missing.</p>
            <Chips options={RESPONSIBILITY_OPTIONS} selected={sub.responsibility_tags} onChange={(v) => change({ responsibility_tags: v })} allowCustom translate={ARABIC} />
            <label>
              Anything in your job that is not clear, or done by two people? <span className="muted">(optional)</span>
              <span className="ar-line" lang="ar" dir="rtl">في حاجة في شغلك مش واضحة أو بيعملها اتنين؟ (اختياري)</span>
              <textarea rows={3} dir="auto" placeholder="e.g. Sales and Finance both follow up the same invoice…" value={sub.responsibilities} onChange={(e) => change({ responsibilities: e.target.value })} />
            </label>
          </>
        )}

        {step === 3 && (
          <>
            <h1>What slows you down? <span className="ar-title" lang="ar">إيه اللي معطّلك؟</span></h1>
            <p className="lead">Pick up to {MAX_CHALLENGES}. Tap the <strong>biggest problem first</strong> — the number shows the order.</p>
            <Chips options={CHALLENGE_OPTIONS} selected={sub.challenge_tags} onChange={(v) => change({ challenge_tags: v })} max={MAX_CHALLENGES} ranked allowCustom translate={ARABIC} />
            <label>
              Give one real example <span className="muted">(optional)</span>
              <span className="ar-line" lang="ar" dir="rtl">اكتب مثال حقيقي (اختياري)</span>
              <textarea rows={3} dir="auto" placeholder="e.g. A hospital order waited 2 weeks for 4 signatures…" value={sub.challenges} onChange={(e) => change({ challenges: e.target.value })} />
            </label>
          </>
        )}

        {step === 4 && (
          <>
            <h1>Build your org chart <span className="ar-title" lang="ar">ابنِ الهيكل التنظيمي</span></h1>
            <p className="lead">Drag roles into the right department and level. Tap a box to change it. Optional — you can skip this step.</p>
            <OrgBoardEditor key={sub.id} value={board} onChange={(structure) => change({ structure })} />
          </>
        )}

        {step === 5 && (
          <>
            <h1>Your ideas <span className="ar-title" lang="ar">أفكارك</span></h1>
            <p className="lead">Short and clear is best. Arabic or English are both fine.</p>
            {[0, 1, 2].map((i) => (
              <label key={i}>
                Idea {i + 1}{i > 0 && <span className="muted"> (optional)</span>}
                <input
                  dir="auto"
                  placeholder={['e.g. One person signs discounts up to 10%', 'e.g. Use Odoo for all orders, not WhatsApp', 'e.g. A loan device for every big hospital'][i]}
                  value={sub.ideas?.[i] ?? ''}
                  onChange={(e) => {
                    const ideas = [...(sub.ideas ?? []), '', '', ''].slice(0, 3)
                    ideas[i] = e.target.value
                    change({ ideas })
                  }}
                />
              </label>
            ))}
            <label>
              One thing to change tomorrow
              <span className="ar-line" lang="ar" dir="rtl">حاجة واحدة تتغير من بكرة</span>
              <input dir="auto" value={sub.quick_win} onChange={(e) => change({ quick_win: e.target.value })} />
            </label>
            <p className="field-label">Would you tell a friend to work at TotalCare? <span className="ar-inline" lang="ar">تنصح صاحبك يشتغل في TotalCare؟</span></p>
            <div className="enps">
              {Array.from({ length: 11 }, (_, n) => (
                <button key={n} type="button" className={`enps-btn ${sub.enps === n ? 'on' : ''} ${n <= 6 ? 'low' : n <= 8 ? 'mid' : 'high'}`} onClick={() => change({ enps: sub.enps === n ? null : n })}>{n}</button>
              ))}
            </div>
            <div className="enps-legend muted small"><span>0 = No · لا</span><span>10 = Yes, for sure · أكيد</span></div>
            <label>
              Anything else? <span className="muted">(optional)</span>
              <span className="ar-line" lang="ar" dir="rtl">أي حاجة تانية؟ (اختياري)</span>
              <textarea rows={3} dir="auto" value={sub.suggestions} onChange={(e) => change({ suggestions: e.target.value })} />
            </label>
          </>
        )}

        {step === LAST && (
          <>
            <h1>{locked ? 'Your submission' : 'Check and send'} <span className="ar-title" lang="ar">{locked ? 'مشاركتك' : 'راجع وابعت'}</span></h1>
            {!locked && <p className="lead">Check your answers. Tap “Edit” to change anything. When you press Send, everything goes to the admin.</p>}
            <SubmissionSummary sub={sub} departmentName={sub.department_id ? deptName.get(sub.department_id) : undefined} onEdit={locked ? undefined : go} />
          </>
        )}
      </div>

      {!locked && (
        <div className="wizard-foot">
          <button type="button" className="secondary" onClick={() => go(step - 1)} disabled={step === 0}><ArrowLeft size={16} /> Back</button>
          <button type="button" className="link danger" onClick={remove}><Trash2 size={14} /> Delete draft</button>
          {step < LAST ? (
            <button type="button" onClick={() => go(step + 1)}>{step === 4 && board.roles.length === 0 ? 'Skip' : 'Next'} <ArrowRight size={16} /></button>
          ) : (
            <button type="button" className="primary-lg" onClick={submit}><Send size={16} /> Send to admin · ابعت</button>
          )}
        </div>
      )}
    </div>
  )
}
