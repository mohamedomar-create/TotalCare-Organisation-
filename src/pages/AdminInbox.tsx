import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Check, ChevronRight, Search, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAdminData } from '../lib/useAdminData'
import { useDirectory } from '../lib/useDirectory'
import { FEEDBACK_CATEGORIES } from '../lib/survey'
import type { Feedback, ReviewStatus } from '../lib/types'

const REVIEW_LABEL: Record<ReviewStatus, string> = { new: 'New', reviewed: 'Reviewed', actioned: 'Actioned' }

export default function AdminInbox() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'feedback' ? 'feedback' : 'submissions'
  const { submissions, reviews, feedback, profiles, loading, error, reload } = useAdminData()
  const { departments } = useDirectory()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | 'new' | 'drafts'>('all')
  const [actionError, setActionError] = useState<string | null>(null)

  const who = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles])
  const deptName = useMemo(() => new Map(departments.map((d) => [d.id, d.name])), [departments])
  const q = query.trim().toLowerCase()

  const subRows = submissions
    .filter((s) => (status === 'drafts' ? s.status === 'draft' : s.status === 'submitted'))
    .filter((s) => status !== 'new' || (reviews.get(s.id)?.status ?? 'new') === 'new')
    .filter((s) => {
      if (!q) return true
      const p = who.get(s.author_id)
      return [p?.full_name, p?.email, s.challenges, s.suggestions, s.quick_win, ...s.challenge_tags, ...(s.ideas ?? [])]
        .some((f) => f?.toLowerCase().includes(q))
    })

  const fbRows = feedback
    .filter((f) => status !== 'new' || f.status === 'new')
    .filter((f) => !q || f.message.toLowerCase().includes(q) || who.get(f.author_id)?.full_name.toLowerCase().includes(q))

  const newSubs = submissions.filter((s) => s.status === 'submitted' && (reviews.get(s.id)?.status ?? 'new') === 'new').length
  const newFb = feedback.filter((f) => f.status === 'new').length

  async function setFeedbackStatus(f: Feedback, next: Feedback['status']) {
    const { error } = await supabase.from('feedback').update({ status: next }).eq('id', f.id)
    setActionError(error?.message ?? null)
    await reload()
  }

  async function deleteFeedback(f: Feedback) {
    if (!confirm('Delete this feedback?')) return
    const { error } = await supabase.from('feedback').delete().eq('id', f.id)
    setActionError(error?.message ?? null)
    await reload()
  }

  return (
    <div className="page wide">
      <h1>Inbox</h1>
      <p className="muted">Everything staff send comes here. Names are visible to you only — never share them with management.</p>

      <div className="tabs">
        <button className={tab === 'submissions' ? 'active' : ''} onClick={() => setParams({})}>Submissions {newSubs > 0 && <span className="badge">{newSubs}</span>}</button>
        <button className={tab === 'feedback' ? 'active' : ''} onClick={() => setParams({ tab: 'feedback' })}>Quick feedback {newFb > 0 && <span className="badge">{newFb}</span>}</button>
      </div>

      <div className="toolbar">
        <div className="search">
          <Search size={16} />
          <input placeholder="Search names and answers…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="segmented">
          <button className={status === 'all' ? 'active' : ''} onClick={() => setStatus('all')}>All</button>
          <button className={status === 'new' ? 'active' : ''} onClick={() => setStatus('new')}>Unread</button>
          {tab === 'submissions' && <button className={status === 'drafts' ? 'active' : ''} onClick={() => setStatus('drafts')}>Drafts</button>}
        </div>
      </div>
      {(error || actionError) && <p className="error">{error || actionError}</p>}
      {loading && <p className="muted">Loading…</p>}

      {!loading && tab === 'submissions' && (
        <ul className="list">
          {subRows.map((s) => {
            const p = who.get(s.author_id)
            const review = reviews.get(s.id)?.status ?? 'new'
            const isNew = s.status === 'submitted' && review === 'new'
            return (
              <li key={s.id}>
                <Link to={`/admin/submissions/${s.id}`} className={`card list-row ${isNew ? 'unread' : ''}`}>
                  {isNew && <span className="dot" aria-label="Unread" />}
                  <div className="grow">
                    <strong>{p?.full_name || p?.email || 'Unknown'}</strong>
                    <span className="muted small"> · {(s.department_id && deptName.get(s.department_id)) || 'Department not given'}{s.role_level && ` · ${s.role_level}`}</span>
                    <div className="muted small clamp">
                      {s.challenge_tags.slice(0, 3).join(' · ') || s.quick_win || 'No challenges picked'}
                    </div>
                  </div>
                  <span className="muted small nowrap">{new Date(s.submitted_at ?? s.updated_at).toLocaleDateString()}</span>
                  {s.status === 'draft' ? <span className="pill">Draft step {(s.current_step ?? 0) + 1}</span> : <span className={`pill status-${review}`}>{REVIEW_LABEL[review]}</span>}
                  <ChevronRight size={18} className="muted" />
                </Link>
              </li>
            )
          })}
          {subRows.length === 0 && <p className="muted">Nothing here yet.</p>}
        </ul>
      )}

      {!loading && tab === 'feedback' && (
        <ul className="list">
          {fbRows.map((f) => {
            const p = who.get(f.author_id)
            const cat = FEEDBACK_CATEGORIES.find((c) => c.value === f.category)
            return (
              <li key={f.id} className={`card feedback-row ${f.status === 'new' ? 'unread' : ''}`}>
                <div className="row between">
                  <span>
                    <span className="pill">{cat?.emoji} {cat?.label}</span>{' '}
                    <strong>{p?.full_name || p?.email || 'Unknown'}</strong>
                    <span className="muted small"> · {new Date(f.created_at).toLocaleString()}</span>
                  </span>
                  <span className="row">
                    {f.status !== 'done' ? (
                      <button className="secondary small-btn" onClick={() => setFeedbackStatus(f, 'done')}><Check size={14} /> Mark done</button>
                    ) : (
                      <button className="secondary small-btn" onClick={() => setFeedbackStatus(f, 'new')}>Reopen</button>
                    )}
                    {f.status === 'new' && <button className="link" onClick={() => setFeedbackStatus(f, 'read')}>Mark read</button>}
                    <button className="icon-btn danger" onClick={() => deleteFeedback(f)} aria-label="Delete"><Trash2 size={15} /></button>
                  </span>
                </div>
                <p className="pre">{f.message}</p>
              </li>
            )
          })}
          {fbRows.length === 0 && <p className="muted">No feedback yet.</p>}
        </ul>
      )}
    </div>
  )
}
