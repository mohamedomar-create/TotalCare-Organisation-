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
    if (!clean.endsWith(`@${ALLOWED_DOMAIN}`)) {
      setError(`Please use your @${ALLOWED_DOMAIN} work e-mail.`)
      return
    }
    setStatus('sending')
    const { error } = await supabase.auth.signInWithOtp({
      email: clean,
      options: { emailRedirectTo: window.location.origin, data: { full_name: fullName.trim() } },
    })
    if (error) {
      setError(error.message)
      setStatus('idle')
    } else {
      setStatus('sent')
    }
  }

  return (
    <div className="login">
      <div className="login-art">
        <div className="logo big">TC</div>
        <h2>Help shape how TotalCare works</h2>
        <ul>
          <li>✔ Quick, tap-to-answer questions</li>
          <li>✔ Draw the structure you’d like to see</li>
          <li>✔ Confidential — sent to the admin only</li>
        </ul>
      </div>
      <form className="card login-card" onSubmit={submit}>
        <h1>Sign in</h1>
        <p className="muted">Use your work e-mail. We’ll send you a one-time sign-in link — no password needed.</p>
        {status === 'sent' ? (
          <p className="notice">Check your inbox for the sign-in link sent to {email}.</p>
        ) : (
          <>
            <label>
              Full name <span className="muted">(first time only)</span>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </label>
            <label>
              Work e-mail
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
