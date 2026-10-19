import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BookUser, CheckCircle2, ClipboardList, Network, PencilRuler, Send, ShieldCheck } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { createSubmission, useMySubmissions } from '../lib/submissions'
import { WIZARD_STEPS } from '../lib/survey'
import FeedbackButton from '../components/FeedbackButton'

export default function Home() {
  const { session, profile } = useAuth()
  const navigate = useNavigate()
  const { items, loading } = useMySubmissions(session?.user.id)
  const [error, setError] = useState<string | null>(null)
  const draft = items.find((s) => s.status === 'draft')
  const submitted = items.filter((s) => s.status === 'submitted')
  const firstName = (profile?.full_name || '').split(' ')[0]

  async function start() {
    try {
      navigate(`/vision/${await createSubmission()}`)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div className="page">
      <section className="hero">
        <div>
          <p className="step-kicker">TotalCare Organisation</p>
          <h1>{firstName ? `Hi ${firstName}, ` : ''}help shape how we work</h1>
          <p className="lead">
            Tell us how the organisation feels today, what gets in your way, and draw the structure you’d like to see.
            It takes about <strong>5 minutes</strong>.
          </p>
        </div>

        {!loading && (
          <div className="card cta-card">
            {draft ? (
              <>
                <p className="muted small">You have a draft in progress</p>
                <div className="progress"><div className="progress-bar" style={{ width: `${Math.round(((draft.current_step ?? 0) / (WIZARD_STEPS.length - 1)) * 100)}%` }} /></div>
                <p>Step {(draft.current_step ?? 0) + 1} of {WIZARD_STEPS.length}: {WIZARD_STEPS[Math.min(draft.current_step ?? 0, WIZARD_STEPS.length - 1)].title}</p>
                <Link className="button big" to={`/vision/${draft.id}`}>Continue <ArrowRight size={18} /></Link>
              </>
            ) : submitted.length > 0 ? (
              <>
                <CheckCircle2 size={36} className="success-icon" />
                <p><strong>Thank you — your submission was sent to the admin.</strong></p>
                <button type="button" className="secondary" onClick={start}>Share another view</button>
              </>
            ) : (
              <>
                <p><strong>Ready when you are</strong></p>
                <button type="button" className="big" onClick={start}>Start my submission <ArrowRight size={18} /></button>
              </>
            )}
            {error && <p className="error">{error}</p>}
          </div>
        )}
      </section>

      <section className="how-grid">
        <div className="card how"><ClipboardList size={22} /><strong>1. Answer quick questions</strong><span className="muted">Tap faces and pick from lists — very little typing.</span></div>
        <div className="card how"><PencilRuler size={22} /><strong>2. Draw your vision</strong><span className="muted">Start from a template or today’s chart and drag boxes around.</span></div>
        <div className="card how"><Send size={22} /><strong>3. Send to the admin</strong><span className="muted">Review everything on one page, then submit.</span></div>
      </section>

      <section className="card privacy-strip">
        <ShieldCheck size={22} />
        <div>
          <strong>Confidential</strong>
          <p className="muted">Your name is visible only to the project admin. Management only sees an anonymised summary.</p>
        </div>
      </section>

      <section className="link-grid">
        <Link to="/org" className="card link-card"><Network size={20} /> <span><strong>Org chart</strong><br /><span className="muted small">See today’s structure</span></span></Link>
        <Link to="/directory" className="card link-card"><BookUser size={20} /> <span><strong>Directory</strong><br /><span className="muted small">Find a colleague</span></span></Link>
        <div className="card link-card"><span><strong>Something else?</strong><br /><span className="muted small">Quick note to the admin</span></span><FeedbackButton /></div>
      </section>
    </div>
  )
}
