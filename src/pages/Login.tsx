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
    <div className="centered">
      <form className="card narrow" onSubmit={submit}>
        <h1>TotalCare Organisation</h1>
        <p className="muted">Sign in with your work e-mail. We'll send you a one-time sign-in link.</p>
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
            <button type="submit" disabled={status === 'sending'}>
              {status === 'sending' ? 'Sending…' : 'Send sign-in link'}
            </button>
          </>
        )}
      </form>
    </div>
  )
}
