import { useState } from 'react'
import { CheckCircle2, MessageSquarePlus, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { FEEDBACK_CATEGORIES } from '../lib/survey'
import type { FeedbackCategory } from '../lib/types'

export default function FeedbackButton({ compact }: { compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<FeedbackCategory>('idea')
  const [message, setMessage] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  function close() {
    setOpen(false)
    setState('idle')
    setMessage('')
    setError(null)
  }

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setState('sending')
    const { error } = await supabase.from('feedback').insert({ category, message: message.trim() })
    if (error) {
      setError(error.message)
      setState('idle')
    } else setState('sent')
  }

  return (
    <>
      <button type="button" className={compact ? 'nav-feedback' : 'secondary'} onClick={() => setOpen(true)}>
        <MessageSquarePlus size={16} /> Send feedback
      </button>
      {open && (
        <div className="modal-backdrop" onClick={close}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Send feedback">
            <button type="button" className="icon-btn modal-close" onClick={close} aria-label="Close"><X size={18} /></button>
            {state === 'sent' ? (
              <div className="center-text">
                <CheckCircle2 size={44} className="success-icon" />
                <h2>Sent to the admin</h2>
                <p className="muted">Thanks — your feedback is in the admin’s inbox.</p>
                <button type="button" onClick={close}>Done</button>
              </div>
            ) : (
              <form onSubmit={send}>
                <h2>Send feedback</h2>
                <p className="muted small">Goes straight to the admin. Your name is visible to the admin only.</p>
                <div className="segmented wide">
                  {FEEDBACK_CATEGORIES.map((c) => (
                    <button key={c.value} type="button" className={category === c.value ? 'active' : ''} onClick={() => setCategory(c.value)}>
                      {c.emoji} {c.label}
                    </button>
                  ))}
                </div>
                <textarea autoFocus rows={5} placeholder="What’s on your mind?" value={message} onChange={(e) => setMessage(e.target.value)} />
                {error && <p className="error">{error}</p>}
                <div className="row end">
                  <button type="button" className="secondary" onClick={close}>Cancel</button>
                  <button type="submit" disabled={!message.trim() || state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Send'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
