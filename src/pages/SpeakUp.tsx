import { useState } from 'react'
import { Copy, KeyRound, Lock, Search, Send, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useDirectory } from '../lib/useDirectory'
import { SAFE_CATEGORIES } from '../lib/survey'

interface CheckResult {
  category: string
  status: 'new' | 'in_review' | 'resolved'
  reply: string
  created_at: string
  replied_at: string | null
}

const STATE = { new: 'Received · اتستلمت', in_review: 'Being looked into · تحت المراجعة', resolved: 'Closed · اتقفلت' }

export default function SpeakUp() {
  const { departments } = useDirectory()
  const [category, setCategory] = useState<string>('concern')
  const [message, setMessage] = useState('')
  const [dept, setDept] = useState('')
  const [code, setCode] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lookup, setLookup] = useState('')
  const [result, setResult] = useState<CheckResult | null | 'none'>(null)
  const [copied, setCopied] = useState(false)

  async function send() {
    setBusy(true)
    setError(null)
    const { data, error } = await supabase.rpc('safe_voice_send', { p_category: category, p_message: message, p_department: dept || null })
    setBusy(false)
    if (error) return setError(error.message)
    setCode(String(data))
    setMessage('')
  }

  async function check() {
    const { data, error } = await supabase.rpc('safe_voice_check', { p_code: lookup })
    if (error) return setError(error.message)
    const row = (Array.isArray(data) ? data[0] : data) as CheckResult | undefined
    setResult(row ?? 'none')
  }

  return (
    <div className="page narrow-page">
      <div className="page-hero speak-hero">
        <div className="page-hero-inner">
          <ShieldCheck size={40} />
          <div>
            <h1>Speak up safely</h1>
            <p className="hero-ar" lang="ar">قول اللي في قلبك بأمان — من غير اسم</p>
            <p className="hero-sub">For things that are hard to say: a manager’s behaviour, harassment, gifts or pressure in tenders, safety, pay. No name, no e-mail and no time is stored with your message.</p>
          </div>
        </div>
      </div>

      {code ? (
        <div className="card success-card center-text">
          <KeyRound size={40} className="success-icon" />
          <h2>Sent. Keep your case code · احتفظ بالكود</h2>
          <p className="case-code">{code}</p>
          <button type="button" className="secondary" onClick={() => { void navigator.clipboard?.writeText(code); setCopied(true) }}><Copy size={15} /> {copied ? 'Copied' : 'Copy code'}</button>
          <p className="muted small">This code is the only way to read the reply — we can’t look it up for you, because we don’t know who sent it. Take a screenshot or write it down.</p>
          <p className="muted small" lang="ar" dir="rtl">الكود ده هو الطريقة الوحيدة لقراية الرد، لأننا مش عارفين مين اللي بعت. صوّره أو اكتبه.</p>
          <button type="button" onClick={() => { setCode(null); setCopied(false) }}>Send another message</button>
        </div>
      ) : (
        <div className="card">
          <p className="field-label">What is it about? <span className="ar-inline" lang="ar">الموضوع عن إيه؟</span></p>
          <div className="chips">
            {SAFE_CATEGORIES.map((c) => (
              <button key={c.value} type="button" className={`chip ${category === c.value ? 'on' : ''}`} onClick={() => setCategory(c.value)}>
                <span className="chip-text">{c.emoji} {c.label}<span className="chip-ar" lang="ar">{c.ar}</span></span>
              </button>
            ))}
          </div>
          <label>
            Tell us what happened <span className="ar-line" lang="ar" dir="rtl">احكي اللي حصل</span>
            <textarea rows={6} dir="auto" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="What happened, where, and what should change. Avoid details that would identify you if you want to stay anonymous." />
          </label>
          <label>
            Department it concerns <span className="muted">(optional — leave empty in small teams)</span>
            <select value={dept} onChange={(e) => setDept(e.target.value)}>
              <option value="">Prefer not to say · أفضّل ألا أقول</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
          <div className="notice small">
            <Lock size={14} /> <b>How it stays anonymous:</b> the message is saved by the database with no link to your account, and only with today’s date. Only the admin can read it. If you write your name or very specific details in the text, that can identify you.
          </div>
          {error && <p className="error">{error}</p>}
          <button type="button" className="primary-lg" disabled={busy || message.trim().length < 5} onClick={send}><Send size={16} /> {busy ? 'Sending…' : 'Send anonymously · ابعت من غير اسم'}</button>
        </div>
      )}

      <div className="card">
        <h2><Search size={18} /> Check a reply · شوف الرد</h2>
        <div className="row">
          <input value={lookup} onChange={(e) => { setLookup(e.target.value.toUpperCase()); setResult(null) }} placeholder="TC-XXXXXXXX" className="mono grow" />
          <button type="button" className="secondary" disabled={lookup.trim().length < 6} onClick={check}>Check</button>
        </div>
        {result === 'none' && <p className="error">No message with this code. Check the letters and try again.</p>}
        {result && result !== 'none' && (
          <div className="reply-box">
            <p><span className={`pill status-${result.status}`}>{STATE[result.status]}</span> <span className="muted small">Sent {result.created_at}</span></p>
            {result.reply ? (
              <>
                <p className="pre" dir="auto">{result.reply}</p>
                <p className="muted small">Replied {result.replied_at}</p>
              </>
            ) : <p className="muted">No reply yet. Replies usually come within 5 working days.</p>}
          </div>
        )}
      </div>
    </div>
  )
}
