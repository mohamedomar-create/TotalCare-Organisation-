import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Mail } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useDirectory } from '../lib/useDirectory'
import type { Profile, ReviewStatus, Submission, SubmissionReview } from '../lib/types'
import SubmissionSummary from '../components/SubmissionSummary'

export default function AdminSubmissionDetail() {
  const { id } = useParams()
  const { departments } = useDirectory()
  const [sub, setSub] = useState<Submission | null>(null)
  const [author, setAuthor] = useState<Profile | null>(null)
  const [review, setReview] = useState<Pick<SubmissionReview, 'status' | 'notes'>>({ status: 'new', notes: '' })
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase.from('submissions').select('*').eq('id', id!).single()
      if (error) return setError(error.message)
      const s = data as Submission
      setSub(s)
      const [p, r] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', s.author_id).single(),
        supabase.from('submission_reviews').select('*').eq('submission_id', s.id).maybeSingle(),
      ])
      setAuthor(p.data as Profile | null)
      if (r.data) setReview({ status: r.data.status, notes: r.data.notes })
      // Opening a new submission marks it as reviewed, like reading an e-mail.
      else if (s.status === 'submitted') {
        await supabase.from('submission_reviews').upsert({ submission_id: s.id, status: 'reviewed' })
        setReview({ status: 'reviewed', notes: '' })
      }
    })()
  }, [id])

  async function save(next: Partial<typeof review>) {
    const merged = { ...review, ...next }
    setReview(merged)
    const { error } = await supabase
      .from('submission_reviews')
      .upsert({ submission_id: id!, ...merged, updated_at: new Date().toISOString() })
    if (error) setError(error.message)
    else setSaved('Saved')
  }

  if (error) return <div className="page"><p className="error">{error}</p></div>
  if (!sub) return <div className="page"><p className="muted">Loading…</p></div>

  const deptName = departments.find((d) => d.id === sub.department_id)?.name

  return (
    <div className="page wide">
      <Link to="/admin/inbox" className="link"><ArrowLeft size={15} /> Inbox</Link>
      <div className="detail-layout">
        <div>
          <h1>{author?.full_name || author?.email || 'Submission'}</h1>
          <p className="muted">
            {sub.status === 'submitted' ? `Submitted ${sub.submitted_at && new Date(sub.submitted_at).toLocaleString()}` : `Draft — last saved ${new Date(sub.updated_at).toLocaleString()}`}
          </p>
          <SubmissionSummary sub={sub} departmentName={deptName} />
        </div>
        <aside className="card detail-side">
          <h3>Follow-up</h3>
          {author?.email && (
            <a className="button secondary" href={`mailto:${author.email}?subject=${encodeURIComponent('Your TotalCare Organisation submission')}`}>
              <Mail size={15} /> E-mail {author.full_name.split(' ')[0] || 'author'}
            </a>
          )}
          <p className="field-label">Status</p>
          <div className="segmented wide">
            {(['new', 'reviewed', 'actioned'] as ReviewStatus[]).map((s) => (
              <button key={s} className={review.status === s ? 'active' : ''} onClick={() => save({ status: s })}>
                {s === 'new' ? 'Unread' : s === 'reviewed' ? 'Reviewed' : 'Actioned'}
              </button>
            ))}
          </div>
          <label>
            Private notes <span className="muted">(only admins see these)</span>
            <textarea rows={6} value={review.notes} onChange={(e) => { setReview({ ...review, notes: e.target.value }); setSaved(null) }} onBlur={() => save({})} />
          </label>
          {saved && <span className="muted small">{saved}</span>}
        </aside>
      </div>
    </div>
  )
}
