import { useMemo, useState } from 'react'
import { Heart, Search, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { KUDOS_VALUES, timeAgo, type Kudos, type StaffMember } from '../../lib/community'
import type { Department } from '../../lib/types'
import { Avatar, celebrate } from '../ui'

export function KudosCard({ k, staff, depts, canDelete, onDelete, index = 0 }: {
  k: Kudos
  staff: Map<string, StaffMember>
  depts: Map<string, Department>
  canDelete?: boolean
  onDelete?: () => void
  index?: number
}) {
  const v = KUDOS_VALUES.find((x) => x.value === k.value) ?? KUDOS_VALUES[0]
  const from = staff.get(k.from_id)
  const to = staff.get(k.to_id)
  const toDept = to?.department_id ? depts.get(to.department_id) : undefined
  return (
    <article className="kudos-card rise" style={{ '--k': v.color, animationDelay: `${Math.min(index, 10) * 45}ms` } as React.CSSProperties}>
      <div className="kudos-ribbon">{v.emoji} {v.label} <span lang="ar">· {v.ar}</span></div>
      <div className="kudos-to">
        <Avatar name={to?.full_name ?? '?'} size={42} color={toDept?.color} />
        <div>
          <strong>{to?.full_name ?? 'Colleague'}</strong>
          <span className="muted small">{toDept?.name ?? ''}</span>
        </div>
      </div>
      <p className="kudos-msg" dir="auto">“{k.message}”</p>
      <div className="kudos-foot muted small">
        <span>from {from?.full_name ?? 'a colleague'} · {timeAgo(k.created_at)}</span>
        {canDelete && <button type="button" className="link danger small" onClick={onDelete}>Remove</button>}
      </div>
    </article>
  )
}

export default function GiveKudosModal({ staff, me, depts, defaultTo, onClose, onSent }: {
  staff: StaffMember[]
  me: string
  depts: Map<string, Department>
  defaultTo?: string
  onClose: () => void
  onSent: () => void
}) {
  const [to, setTo] = useState(defaultTo ?? '')
  const [q, setQ] = useState('')
  const [value, setValue] = useState('teamwork')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const people = useMemo(
    () => staff.filter((s) => s.id !== me && (!q.trim() || s.full_name.toLowerCase().includes(q.trim().toLowerCase()))),
    [staff, me, q],
  )
  const chosen = staff.find((s) => s.id === to)

  async function send(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.from('kudos').insert({ to_id: to, value, message: message.trim() })
    setBusy(false)
    if (error) return setError(error.message)
    celebrate()
    onSent()
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal modal-lg" onClick={(e) => e.stopPropagation()} onSubmit={send}>
        <button type="button" className="icon-btn modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <div className="modal-head">
          <span className="modal-icon pink"><Heart size={22} /></span>
          <div>
            <h2>Thank a colleague</h2>
            <p className="muted small" lang="ar">اشكر زميلك · they get +10 points</p>
          </div>
        </div>

        <p className="field-label">Who?</p>
        {chosen ? (
          <div className="picked">
            <Avatar name={chosen.full_name} size={34} color={chosen.department_id ? depts.get(chosen.department_id)?.color : undefined} />
            <strong>{chosen.full_name}</strong>
            <button type="button" className="link" onClick={() => setTo('')}>Change</button>
          </div>
        ) : (
          <>
            <div className="search"><Search size={16} /><input autoFocus placeholder="Type a name…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <div className="people-pick">
              {people.slice(0, 30).map((s) => (
                <button key={s.id} type="button" className="person-pick" onClick={() => setTo(s.id)}>
                  <Avatar name={s.full_name} size={28} color={s.department_id ? depts.get(s.department_id)?.color : undefined} />
                  <span>{s.full_name}<small className="muted">{s.department_id ? depts.get(s.department_id)?.name : ''}</small></span>
                </button>
              ))}
              {people.length === 0 && <p className="muted small">Nobody found. Colleagues appear here after they sign in once.</p>}
            </div>
          </>
        )}

        <p className="field-label">For what?</p>
        <div className="value-grid">
          {KUDOS_VALUES.map((v) => (
            <button key={v.value} type="button" className={`value-btn ${value === v.value ? 'on' : ''}`} style={{ '--k': v.color } as React.CSSProperties} onClick={() => setValue(v.value)}>
              <span className="value-emoji">{v.emoji}</span>
              <span>{v.label}</span>
              <small lang="ar">{v.ar}</small>
            </button>
          ))}
        </div>
        <label>
          Your message
          <textarea rows={3} dir="auto" required minLength={3} maxLength={500} placeholder="e.g. Thank you for staying late to finish the hospital installation!" value={message} onChange={(e) => setMessage(e.target.value)} />
        </label>
        <p className="muted small">Kudos are public — everyone can see them on the wall.</p>
        {error && <p className="error">{error}</p>}
        <div className="row end">
          <button type="button" className="secondary" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={busy || !to || message.trim().length < 3}><Heart size={16} /> {busy ? 'Sending…' : 'Send thanks'}</button>
        </div>
      </form>
    </div>
  )
}
