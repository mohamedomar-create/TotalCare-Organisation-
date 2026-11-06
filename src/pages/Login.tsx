import { useState } from 'react'
import { ALLOWED_DOMAIN, supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const clean = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setError('Please enter a valid e-mail.')
      return
    }
    setStatus('sending')
    const { error } = await supabase.auth.signInWithOtp({
      email: clean,
      options: { emailRedirectTo: window.location.origin, data: { full_name: fullName.trim() } },
    })
    if (error) {
      // The database only accepts company e-mails and invited addresses.
      setError(/invited|database error/i.test(error.message) ? `This e-mail hasn’t been invited. Use your @${ALLOWED_DOMAIN} e-mail, or ask HR for an invitation. · الإيميل ده مش متسجل، اطلب دعوة.` : error.message)
      setStatus('idle')
    } else {
      setStatus('sent')
    }
  }

  return (
    <div className="login">
      <div className="login-art">
        <div className="logo big">TC</div>
        <h2>Your voice shapes TotalCare</h2>
        <p lang="ar" dir="rtl" className="hero-ar">صوتك بيشكّل TotalCare</p>
        <ul>
          <li>✔ Rate each department, name the best, share ideas</li>
          <li>✔ About 8 minutes, Arabic or English</li>
          <li>✔ You can answer anonymously</li>
        </ul>
      </div>
      <form className="card login-card" onSubmit={submit}>
        <h1>Sign in</h1>
        <p className="muted">Use your work e-mail, or the e-mail HR invited. We’ll send you a one-time sign-in link — no password needed.</p>
        <a className="button secondary join-link" href="/join">🔑 I have an invitation code or link (no e-mail) · عندي كود دعوة</a>
        {status === 'sent' ? (
          <p className="notice">Check your inbox for the sign-in link sent to {email}.</p>
        ) : (
          <>
            <label>
              Full name <span className="muted">(first time only)</span>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </label>
            <label>
              E-mail
              <input
                type="email"
                required
                placeholder={`name@${ALLOWED_DOMAIN}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            {error && <p className="error">{error}</p>}
            <button type="submit" className="big" disabled={status === 'sending'}>
              {status === 'sending' ? 'Sending…' : 'Send sign-in link'}
            </button>
          </>
        )}
      </form>
    </div>
  )
}
