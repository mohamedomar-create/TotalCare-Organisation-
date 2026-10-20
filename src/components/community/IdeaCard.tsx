import { Link } from 'react-router-dom'
import { MessageCircle, ThumbsUp } from 'lucide-react'
import { IDEA_CATEGORIES, IDEA_STATUS, timeAgo, type Idea, type StaffMember } from '../../lib/community'
import type { Department } from '../../lib/types'
import { Avatar, SectorChip } from '../ui'

export function authorLabel(idea: Idea, staff: Map<string, StaffMember>, depts: Map<string, Department>) {
  if (idea.anonymous || !idea.author_id) {
    const d = idea.department_id ? depts.get(idea.department_id) : undefined
    return d ? `A colleague from ${d.name}` : 'A colleague'
  }
  return staff.get(idea.author_id)?.full_name ?? 'A colleague'
}

export default function IdeaCard({ idea, voted, onVote, staff, depts, index = 0 }: {
  idea: Idea
  voted: boolean
  onVote: () => void
  staff: Map<string, StaffMember>
  depts: Map<string, Department>
  index?: number
}) {
  const status = IDEA_STATUS[idea.status]
  const cat = IDEA_CATEGORIES.find((c) => c.value === idea.category)
  const dept = idea.department_id ? depts.get(idea.department_id) : undefined
  const author = authorLabel(idea, staff, depts)
  return (
    <article className={`idea-card rise ${idea.status === 'done' ? 'is-done' : ''}`} style={{ animationDelay: `${Math.min(index, 8) * 50}ms`, '--c': dept?.color ?? '#0e7490' } as React.CSSProperties}>
      <button type="button" className={`vote ${voted ? 'on' : ''}`} onClick={onVote} aria-pressed={voted} title={voted ? 'Remove your like' : 'Like this idea'}>
        <ThumbsUp size={18} />
        <span>{idea.votes}</span>
      </button>
      <div className="grow">
        <div className="idea-meta">
          <span className={`status-pill tone-${status.tone}`}>{status.label}</span>
          {cat && <span className="muted small">{cat.emoji} {cat.label}</span>}
          <SectorChip dept={dept} />
        </div>
        <Link to={`/ideas/${idea.id}`} className="idea-title">{idea.title}</Link>
        {idea.body && <p className="idea-body" dir="auto">{idea.body}</p>}
        {idea.admin_note && <p className="idea-note">💬 <strong>Management:</strong> {idea.admin_note}</p>}
        <div className="idea-foot">
          <span className="idea-author">
            {idea.anonymous ? <span className="anon-dot">🕶️</span> : <Avatar name={author} size={22} color={dept?.color} />}
            {author} · {timeAgo(idea.created_at)}
          </span>
          <Link to={`/ideas/${idea.id}`} className="muted small plain"><MessageCircle size={14} /> {idea.comments}</Link>
        </div>
      </div>
    </article>
  )
}
