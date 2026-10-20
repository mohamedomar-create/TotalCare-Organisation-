import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, EyeOff, Send, ThumbsUp, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useDirectory } from '../lib/useDirectory'
import { IDEA_CATEGORIES, IDEA_STATUS, timeAgo, useStaff, type Idea, type IdeaComment, type IdeaStatus } from '../lib/community'
import { authorLabel } from '../components/community/IdeaCard'
import { Avatar, SectorChip, celebrate } from '../components/ui'

const STEPS: IdeaStatus[] = ['new', 'review', 'planned', 'done']

export default function IdeaDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { session, profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const { departments } = useDirectory()
  const staffList = useStaff()
  const [idea, setIdea] = useState<Idea | null>(null)
  const [comments, setComments] = useState<IdeaComment[]>([])
  const [voted, setVoted] = useState(false)
  const [text, setText] = useState('')
  const [note, setNote] = useState('')
  const [realAuthor, setRealAuthor] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const staff = useMemo(() => new Map(staffList.map((s) => [s.id, s])), [staffList])
  const depts = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments])

  const load = useCallback(async () => {
    const [i, c, v, a] = await Promise.all([
      supabase.from('ideas').select('*').eq('id', id!).maybeSingle(),
      supabase.from('idea_comments').select('*').eq('idea_id', id!).order('created_at'),
      supabase.from('idea_votes').select('idea_id').eq('idea_id', id!).eq('user_id', session!.user.id),
      supabase.from('idea_authors').select('author_id').eq('idea_id', id!).maybeSingle(),
    ])
    if (!i.data) return setError('This idea is not available.')
    setIdea(i.data as Idea)
    setNote((i.data as Idea).admin_note)
    setComments((c.data ?? []) as IdeaComment[])
    setVoted((v.data ?? []).length > 0)
    setRealAuthor((a.data as { author_id: string } | null)?.author_id ?? null)
  }, [id, session])

  useEffect(() => {
    void load()
  }, [load])

  async function vote() {
    if (!idea) return
    setVoted(!voted)
    setIdea({ ...idea, votes: idea.votes + (voted ? -1 : 1) })
    if (voted) await supabase.from('idea_votes').delete().eq('idea_id', idea.id).eq('user_id', session!.user.id)
    else await supabase.from('idea_votes').insert({ idea_id: idea.id })
  }

  async function comment(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    const { error } = await supabase.from('idea_comments').insert({ idea_id: id, body: text.trim() })
    if (error) return setError(error.message)
    setText('')
    void load()
  }

  async function moderate(patch: Partial<Idea>) {
    const { error } = await supabase.from('ideas').update(patch).eq('id', id!)
    if (error) return setError(error.message)
    if (patch.status === 'done') celebrate()
    void load()
  }

  if (error) return <div className="page"><p className="error">{error}</p><Link to="/ideas" className="link"><ArrowLeft size={15} /> All ideas</Link></div>
  if (!idea) return <div className="page"><p className="muted">Loading…</p></div>

  const dept = idea.department_id ? depts.get(idea.department_id) : undefined
  const cat = IDEA_CATEGORIES.find((c) => c.value === idea.category)
  const stepIndex = STEPS.indexOf(idea.status)
  const mine = realAuthor === session?.user.id

  return (
    <div className="page">
      <Link to="/ideas" className="link"><ArrowLeft size={15} /> All ideas</Link>
      <article className="card idea-detail rise" style={{ '--c': dept?.color ?? '#0e7490' } as React.CSSProperties}>
        <div className="idea-meta">
          <span className={`status-pill tone-${IDEA_STATUS[idea.status].tone}`}>{IDEA_STATUS[idea.status].label}</span>
          {cat && <span className="muted small">{cat.emoji} {cat.label}</span>}
          <SectorChip dept={dept} />
          {idea.hidden && <span className="pill">Hidden</span>}
        </div>
        <h1 dir="auto">{idea.title}</h1>
        {idea.body && <p className="pre" dir="auto">{idea.body}</p>}
        <p className="muted small">
          {authorLabel(idea, staff, depts)} · {timeAgo(idea.created_at)}
          {mine && idea.anonymous && ' · (this is your idea — only the admin knows)'}
          {isAdmin && idea.anonymous && realAuthor && !mine && ` · admin only: posted by ${staff.get(realAuthor)?.full_name ?? 'unknown'}`}
        </p>

        {idea.status !== 'declined' && (
          <ol className="journey">
            {STEPS.map((s, i) => (
              <li key={s} className={i <= stepIndex ? 'reached' : ''}>
                <span className="journey-dot">{i <= stepIndex ? <Check size={12} /> : i + 1}</span>
                <span>{IDEA_STATUS[s].label}</span>
              </li>
            ))}
          </ol>
        )}
        {idea.admin_note && <p className="idea-note">💬 <strong>Management:</strong> {idea.admin_note}</p>}

        <div className="row">
          <button type="button" className={`vote big-vote ${voted ? 'on' : ''}`} onClick={vote}><ThumbsUp size={18} /> {voted ? 'Liked' : 'Like'} · {idea.votes}</button>
        </div>

        {isAdmin && (
          <div className="admin-box">
            <p className="field-label">Admin: move this idea along (the author earns points at Planned and Done)</p>
            <div className="segmented wide">
              {(['new', 'review', 'planned', 'done', 'declined'] as IdeaStatus[]).map((s) => (
                <button key={s} type="button" className={idea.status === s ? 'active' : ''} onClick={() => moderate({ status: s })}>{IDEA_STATUS[s].label}</button>
              ))}
            </div>
            <label>
              Reply from management (everyone sees this)
              <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => note !== idea.admin_note && moderate({ admin_note: note })} />
            </label>
            <div className="row">
              <button type="button" className="secondary" onClick={() => moderate({ hidden: !idea.hidden })}><EyeOff size={15} /> {idea.hidden ? 'Show again' : 'Hide from staff'}</button>
              <button type="button" className="danger" onClick={async () => { if (confirm('Delete this idea for good?')) { await supabase.from('ideas').delete().eq('id', idea.id); navigate('/ideas') } }}><Trash2 size={15} /> Delete</button>
            </div>
          </div>
        )}
      </article>

      <section className="card">
        <h2>Discussion ({comments.length})</h2>
        {comments.length === 0 && <p className="muted small">No comments yet — add yours.</p>}
        <ul className="comments">
          {comments.map((c) => {
            const who = staff.get(c.author_id)
            const d = who?.department_id ? depts.get(who.department_id) : undefined
            return (
              <li key={c.id} className="rise">
                <Avatar name={who?.full_name ?? '?'} size={32} color={d?.color} />
                <div className="grow">
                  <strong>{who?.full_name ?? 'Colleague'}</strong> <span className="muted small">{timeAgo(c.created_at)}</span>
                  <p className="pre" dir="auto">{c.body}</p>
                </div>
                {(c.author_id === session?.user.id || isAdmin) && (
                  <button type="button" className="icon-btn danger" aria-label="Delete comment" onClick={async () => { await supabase.from('idea_comments').delete().eq('id', c.id); void load() }}><Trash2 size={14} /></button>
                )}
              </li>
            )
          })}
        </ul>
        <form className="comment-form" onSubmit={comment}>
          <input dir="auto" placeholder="Add a comment… (your name is shown)" value={text} onChange={(e) => setText(e.target.value)} />
          <button type="submit" disabled={!text.trim()}><Send size={16} /></button>
        </form>
      </section>
    </div>
  )
}
