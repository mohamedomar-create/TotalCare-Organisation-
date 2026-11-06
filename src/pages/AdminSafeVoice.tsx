import { useCallback, useEffect, useState } from 'react'
import { Lock, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useDirectory } from '../lib/useDirectory'
import { SAFE_CATEGORIES } from '../lib/survey'

interface Message {
  id: string
  code: string
  category: string
  message: string
  department_id: string | null
  status: 'new' | 'in_review' | 'resolved'
  reply: string
  created_at: string
  replied_at: string | null
}

const STATUS_LABEL = { new: 'New', in_review: 'In review', resolved: 'Resolved' }

export default function AdminSafeVoice() {
  const { departments } = useDirectory()
  const [items, setItems] = useState<Message[]>([])
  const [filter, setFilter] = useState<'open' | 'all'>('open')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('safe_voice').select('*').order('created_at', { ascending: false })
    setError(error ? (error.message.includes('safe_voice') ? 'Run supabase/migrations/0006_survey_v2.sql first (see the README).' : error.message) : null)
    setItems((data ?? []) as Message[])
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  async function save(m: Message, patch: Partial<Message>) {
    const { error } = await supabase.from('safe_voice').update(patch).eq('id', m.id)
    if (error) return setError(error.message)
    void load()
  }

  const shown = items.filter((m) => filter === 'all' || m.status !== 'resolved')
  const dept = (id: string | null) => departments.find((d) => d.id === id)?.name
  return (
    <div className="page">
      <h1><ShieldCheck size={26} /> Speak-up inbox <span className="ar-title" lang="ar">صندوق قول رأيك بأمان</span></h1>
      <p className="notice small"><Lock size={14} /> These messages were saved with no name and only the date. Reply here — the sender reads it with their case code. Aim to reply within 5 working days, and never try to guess who wrote a message.</p>
      <div className="segmented" style={{ marginBottom: 12 }}>
        <button type="button" className={filter === 'open' ? 'on' : ''} onClick={() => setFilter('open')}>Open ({items.filter((m) => m.status !== 'resolved').length})</button>
        <button type="button" className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>All ({items.length})</button>
      </div>
      {error && <p className="error">{error}</p>}
      {shown.length === 0 && <div className="card empty-state"><p>No messages.</p></div>}
      <ul className="list">
        {shown.map((m) => {
          const cat = SAFE_CATEGORIES.find((c) => c.value === m.category)
          return (
            <li key={m.id} className={`card safe-item ${m.status === 'new' ? 'unread' : ''}`}>
              <div className="row between">
                <span><span className="pill">{cat?.emoji} {cat?.label}</span> <span className="mono small">{m.code}</span> <span className="muted small">· {m.created_at}{dept(m.department_id) && ` · about ${dept(m.department_id)}`}</span></span>
                <select value={m.status} onChange={(e) => void save(m, { status: e.target.value as Message['status'] })} style={{ width: 'auto' }}>
                  {(Object.keys(STATUS_LABEL) as Message['status'][]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </div>
              <p className="pre" dir="auto">{m.message}</p>
              <label>
                Reply (the sender sees this)
                <textarea rows={3} dir="auto" value={drafts[m.id] ?? m.reply} onChange={(e) => setDrafts({ ...drafts, [m.id]: e.target.value })} />
              </label>
              <div className="row">
                <button type="button" className="small-btn" disabled={(drafts[m.id] ?? m.reply) === m.reply} onClick={() => void save(m, { reply: drafts[m.id] ?? '', status: m.status === 'new' ? 'in_review' : m.status })}>Save reply</button>
                {m.replied_at && <span className="muted small">Replied {m.replied_at}</span>}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
