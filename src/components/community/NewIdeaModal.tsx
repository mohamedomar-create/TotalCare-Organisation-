import { useState } from 'react'
import { EyeOff, Lightbulb, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { IDEA_CATEGORIES } from '../../lib/community'
import type { Department } from '../../lib/types'
import { celebrate } from '../ui'

export default function NewIdeaModal({ departments, defaultDept, onClose, onPosted }: {
  departments: Department[]
  defaultDept?: string | null
  onClose: () => void
  onPosted: () => void
}) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [dept, setDept] = useState<string>(defaultDept ?? '')
  const [category, setCategory] = useState('improvement')
  const [anonymous, setAnonymous] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.rpc('post_idea', {
      p_title: title,
      p_body: body,
      p_department: dept || null,
      p_category: category,
      p_anonymous: anonymous,
    })
    setBusy(false)
    if (error) return setError(error.message)
    celebrate()
    onPosted()
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal modal-lg" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <button type="button" className="icon-btn modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <div className="modal-head">
          <span className="modal-icon"><Lightbulb size={22} /></span>
          <div>
            <h2>Share an idea</h2>
            <p className="muted small" lang="ar">شارك فكرة · +10 points</p>
          </div>
        </div>
        <label>
          Your idea in one line
          <input autoFocus required minLength={3} maxLength={140} dir="auto" placeholder="e.g. One shared calendar for all field visits" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          Why it helps <span className="muted">(optional)</span>
          <textarea rows={3} dir="auto" value={body} onChange={(e) => setBody(e.target.value)} />
        </label>
        <p className="field-label">Topic</p>
        <div className="chips">
          {IDEA_CATEGORIES.map((c) => (
            <button key={c.value} type="button" className={`chip ${category === c.value ? 'on' : ''}`} onClick={() => setCategory(c.value)}>
              <span className="chip-text">{c.emoji} {c.label}<span className="chip-ar" lang="ar">{c.ar}</span></span>
            </button>
          ))}
        </div>
        <label>
          Which sector does it help?
          <select value={dept} onChange={(e) => setDept(e.target.value)}>
            <option value="">Whole company</option>
            {departments.filter((d) => d.name !== 'Management').map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
        <label className={`anon-toggle ${anonymous ? 'on' : ''}`}>
          <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
          <EyeOff size={18} />
          <span>
            <strong>Post without my name</strong>
            <span className="muted small">Colleagues see “A colleague{dept ? ' from ' + (departments.find((d) => d.id === dept)?.name ?? '') : ''}”. Only the admin can see it was you. You still get the points.</span>
          </span>
        </label>
        {error && <p className="error">{error}</p>}
        <div className="row end">
          <button type="button" className="secondary" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={busy || title.trim().length < 3}>{busy ? 'Posting…' : 'Post idea'}</button>
        </div>
      </form>
    </div>
  )
}
