import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, ChevronRight, CircleDashed, Plus } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { createSubmission, useAllowance, useMySubmissions } from '../lib/submissions'
import { WIZARD_STEPS } from '../lib/survey'
import PrivacyNotice from '../components/PrivacyNotice'
import { asBoard } from '../lib/orgBoard'

export default function MyVision() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const { items, loading, error } = useMySubmissions(session?.user.id)
  const { canStart } = useAllowance(session?.user.id)
  const [createError, setCreateError] = useState<string | null>(null)

  async function create() {
    try {
      navigate(`/vision/${await createSubmission()}`)
    } catch (e) {
      setCreateError((e as Error).message)
    }
  }

  return (
    <div className="page">
      <div className="row between">
        <h1>My submissions</h1>
        {canStart && <button onClick={create}><Plus size={16} /> New submission</button>}
      </div>
      {!canStart && items.some((s) => s.status === 'submitted') && (
        <p className="notice">✅ Thank you — your view has been sent. The admin will open a new round when it’s time to share again.</p>
      )}
      <PrivacyNotice />
      {(error || createError) && <p className="error">{error || createError}</p>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : items.length === 0 ? (
        <div className="card empty-state">
          <p>You haven’t started yet.</p>
          <button onClick={create}>Start my submission</button>
        </div>
      ) : (
        <ul className="list">
          {items.map((s) => {
            const step = Math.min(s.current_step ?? 0, WIZARD_STEPS.length - 1)
            return (
              <li key={s.id}>
                <Link to={`/vision/${s.id}`} className="card list-row">
                  {s.status === 'submitted' ? <CheckCircle2 className="success-icon" size={22} /> : <CircleDashed size={22} className="muted" />}
                  <div className="grow">
                    <strong>{s.status === 'submitted' ? 'Submitted to admin' : `Draft — step ${step + 1} of ${WIZARD_STEPS.length}`}</strong>
                    <div className="muted small">
                      {s.status === 'submitted' && s.submitted_at
                        ? `Sent ${new Date(s.submitted_at).toLocaleString()}`
                        : `Last saved ${new Date(s.updated_at).toLocaleString()}`}
                      {' · '}{asBoard(s.structure).roles.length} roles on org chart · {s.challenge_tags.length} challenges
                    </div>
                  </div>
                  <span className="pill">{s.status === 'submitted' ? 'View' : 'Continue'}</span>
                  <ChevronRight size={18} className="muted" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
