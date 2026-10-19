import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Lock, Send, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useDirectory } from '../lib/useDirectory'
import type { Submission } from '../lib/types'
import {
  CHALLENGE_OPTIONS,
  MAX_CHALLENGES,
  RATING_DIMENSIONS,
  RESPONSIBILITY_OPTIONS,
  ROLE_LEVELS,
  WIZARD_STEPS,
} from '../lib/survey'
import Chips from '../components/Chips'
import RatingRow from '../components/RatingRow'
import DiagramEditor from '../components/diagram/DiagramEditor'
import SubmissionSummary from '../components/SubmissionSummary'
import PrivacyNotice from '../components/PrivacyNotice'

const LAST = WIZARD_STEPS.length - 1

export default function VisionWizard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { departments, people } = useDirectory()
  const [sub, setSub] = useState<Submission | null>(null)
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'dirty'>('saved')
  const [done, setDone] = useState(false)
  const pending = useRef<Partial<Submission>>({})
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    supabase
      .from('submissions')
      .select('*')
      .eq('id', id!)
      .single()
      .then(({ data, error }) => {
        if (error) return setError(error.message)
        const s = data as Submission
        setSub(s)
        setStep(s.status === 'submitted' ? LAST : Math.min(s.current_step ?? 0, LAST))
      })
  }, [id])

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (Object.keys(pending.current).length) e.preventDefault()
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [])

  const deptName = useMemo(() => new Map(departments.map((d) => [d.id, d.name])), [departments])
  const locked = sub?.status === 'submitted'

  async function flush() {
    window.clearTimeout(timer.current)
    const patch = pending.current
    pending.current = {}
    if (Object.keys(patch).length === 0) return true
    setSaveState('saving')
    const { error } = await supabase.from('submissions').update(patch).eq('id', id!)
    if (error) {
      setError(error.message)
      pending.current = { ...patch, ...pending.current }
      setSaveState('dirty')
      return false
    }
    setSaveState(Object.keys(pending.current).length ? 'dirty' : 'saved')
    return true
  }

  function change(patch: Partial<Submission>) {
    if (locked) return
    setSub((s) => (s ? { ...s, ...patch } : s))
    pending.current = { ...pending.current, ...patch }
    setSaveState('dirty')
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
    const { error } = await supabase.from('submissions').update({ status: 'submitted', current_step: LAST }).eq('id', id!)
    if (error) return setError(error.message)
    setSub((s) => (s ? { ...s, status: 'submitted' } : s))
    setDone(true)
  }

  async function remove() {
    if (!confirm('Delete this draft? This cannot be undone.')) return
    window.clearTimeout(timer.current)
    pending.current = {}
    const { error } = await supabase.from('submissions').delete().eq('id', id!)
    if (error) setError(error.message)
    else navigate('/vision')
  }

  if (error) return <div className="page"><p className="error">{error}</p></div>
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

  const answeredRatings = RATING_DIMENSIONS.filter((d) => sub.ratings?.[d.key]).length
  const progress = Math.round((step / LAST) * 100)

  return (
    <div className={`page wizard ${step === 4 ? 'wide' : ''}`}>
      <div className="wizard-head">
        <div className="row between">
          <Link to="/vision" className="link"><ArrowLeft size={15} /> My submissions</Link>
          <span className="muted small save-state">
            {locked ? <><Lock size={13} /> Submitted {sub.submitted_at && new Date(sub.submitted_at).toLocaleDateString()}</> : saveState === 'saved' ? <><Check size={13} /> Saved</> : saveState === 'saving' ? 'Saving…' : 'Unsaved changes'}
          </span>
        </div>
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
        <p className="step-kicker">Step {step + 1} of {WIZARD_STEPS.length} · {WIZARD_STEPS[step].hint}</p>

        {step === 0 && (
          <>
            <h1>Let’s start with you</h1>
            <PrivacyNotice />
            <p className="field-label">Which department are you in?</p>
            <div className="chips">
              {departments.map((d) => (
                <button key={d.id} type="button" className={`chip ${sub.department_id === d.id ? 'on' : ''}`} onClick={() => change({ department_id: d.id })} style={sub.department_id === d.id ? { background: d.color, borderColor: d.color } : undefined}>
                  {d.name}
                </button>
              ))}
              <button type="button" className={`chip ${sub.department_id === null ? 'on' : ''}`} onClick={() => change({ department_id: null })}>Prefer not to say</button>
            </div>
            <p className="field-label">Your level</p>
            <div className="chips">
              {ROLE_LEVELS.map((l) => (
                <button key={l} type="button" className={`chip ${sub.role_level === l ? 'on' : ''}`} onClick={() => change({ role_level: sub.role_level === l ? '' : l })}>{l}</button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1>How do things feel today?</h1>
            <p className="lead">Tap the face that fits best. {answeredRatings} of {RATING_DIMENSIONS.length} answered.</p>
            {RATING_DIMENSIONS.map((d) => (
              <RatingRow key={d.key} question={d.question} value={sub.ratings?.[d.key]} onChange={(v) => change({ ratings: { ...sub.ratings, [d.key]: v } })} />
            ))}
          </>
        )}

        {step === 2 && (
          <>
            <h1>What does your role involve?</h1>
            <p className="lead">Tap everything you’re responsible for today. Add your own if it’s missing.</p>
            <Chips options={RESPONSIBILITY_OPTIONS} selected={sub.responsibility_tags} onChange={(v) => change({ responsibility_tags: v })} allowCustom />
            <label>
              Anything unclear or overlapping in your role? <span className="muted">(optional)</span>
              <textarea rows={3} placeholder="e.g. Both Sales and Operations approve client discounts…" value={sub.responsibilities} onChange={(e) => change({ responsibilities: e.target.value })} />
            </label>
          </>
        )}

        {step === 3 && (
          <>
            <h1>What gets in the way?</h1>
            <p className="lead">Pick up to {MAX_CHALLENGES}, <strong>most important first</strong> — the number shows the order.</p>
            <Chips options={CHALLENGE_OPTIONS} selected={sub.challenge_tags} onChange={(v) => change({ challenge_tags: v })} max={MAX_CHALLENGES} ranked allowCustom />
            <label>
              Give an example <span className="muted">(optional)</span>
              <textarea rows={3} placeholder="A real situation helps us understand the problem." value={sub.challenges} onChange={(e) => change({ challenges: e.target.value })} />
            </label>
          </>
        )}

        {step === 4 && (
          <>
            <h1>Draw the organisation you’d like to see</h1>
            <p className="lead">Start from a template (or today’s org chart), then move, rename and connect boxes. Optional — skip if you prefer.</p>
            <DiagramEditor
              key={sub.id}
              value={sub.structure}
              onChange={(structure) => change({ structure })}
              people={people}
              departments={departments}
              height="max(420px, calc(100vh - 420px))"
            />
          </>
        )}

        {step === 5 && (
          <>
            <h1>Your ideas</h1>
            <p className="lead">Short and specific works best.</p>
            {[0, 1, 2].map((i) => (
              <label key={i}>
                Idea {i + 1}{i > 0 && <span className="muted"> (optional)</span>}
                <input
                  placeholder={['e.g. One person approves discounts up to 10%', 'e.g. Weekly 15-minute team stand-up', 'e.g. Shared calendar for field visits'][i]}
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
              If you could change <strong>one thing tomorrow</strong>, what would it be?
              <input value={sub.quick_win} onChange={(e) => change({ quick_win: e.target.value })} />
            </label>
            <p className="field-label">How likely are you to recommend TotalCare as a place to work?</p>
            <div className="enps">
              {Array.from({ length: 11 }, (_, n) => (
                <button key={n} type="button" className={`enps-btn ${sub.enps === n ? 'on' : ''} ${n <= 6 ? 'low' : n <= 8 ? 'mid' : 'high'}`} onClick={() => change({ enps: sub.enps === n ? null : n })}>{n}</button>
              ))}
            </div>
            <div className="enps-legend muted small"><span>Not likely</span><span>Very likely</span></div>
            <label>
              Anything else the admin should know? <span className="muted">(optional)</span>
              <textarea rows={3} value={sub.suggestions} onChange={(e) => change({ suggestions: e.target.value })} />
            </label>
          </>
        )}

        {step === LAST && (
          <>
            <h1>{locked ? 'Your submission' : 'Review and send'}</h1>
            {!locked && <p className="lead">Check your answers. Use “Edit” to go back to any step. Everything is sent to the admin when you submit.</p>}
            <SubmissionSummary sub={sub} departmentName={sub.department_id ? deptName.get(sub.department_id) : undefined} onEdit={locked ? undefined : go} />
          </>
        )}
      </div>

      {!locked && (
        <div className="wizard-foot">
          <button type="button" className="secondary" onClick={() => go(step - 1)} disabled={step === 0}><ArrowLeft size={16} /> Back</button>
          <button type="button" className="link danger" onClick={remove}><Trash2 size={14} /> Delete draft</button>
          {step < LAST ? (
            <button type="button" onClick={() => go(step + 1)}>{step === 4 && sub.structure.nodes.length === 0 ? 'Skip' : 'Next'} <ArrowRight size={16} /></button>
          ) : (
            <button type="button" className="primary-lg" onClick={submit}><Send size={16} /> Submit to admin</button>
          )}
        </div>
      )}
    </div>
  )
}
