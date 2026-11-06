import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, KeyRound, LogOut, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

interface Preview {
  full_name: string
  department: string
  valid: boolean
  team: boolean
}

/**
 * Joining with an invitation link or code — for colleagues without a company e-mail.
 * The phone is signed in anonymously, then the invitation turns it into a member.
 */
export default function Join() {
  const params = useParams()
  const navigate = useNavigate()
  const { session, refreshProfile } = useAuth()
  // /join/:code is rendered outside <Routes>, so read the code from the path as well.
  const fromPath = typeof window !== 'undefined' ? window.location.pathname.match(/^\/join\/([^/]+)/)?.[1] : undefined
  const [code, setCode] = useState((params.code ?? fromPath ?? '').toUpperCase())
  const [preview, setPreview] = useState<Preview | null | 'none'>(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const c = code.trim()
    if (c.length < 6) return setPreview(null)
    const t = setTimeout(() => {
      supabase.rpc('invite_preview', { p_code: c }).then(({ data, error }) => {
        if (error) return setError(error.message)
        const row = (Array.isArray(data) ? data[0] : data) as Preview | undefined
        setPreview(row ?? 'none')
        if (row?.full_name) setName((n) => n || row.full_name)
      })
    }, 250)
    return () => clearTimeout(t)
  }, [code])

  async function join() {
    setBusy(true)
    setError(null)
    try {
      if (!session) {
        const { error } = await supabase.auth.signInAnonymously()
        if (error) throw new Error(/anonymous/i.test(error.message) ? 'Joining by link is not switched on yet. Please tell the survey admin (Supabase → Authentication → allow anonymous sign-ins).' : error.message)
      }
      const { error } = await supabase.rpc('redeem_invite', { p_code: code.trim(), p_name: name.trim() })
      if (error) throw new Error(error.message)
      await refreshProfile()
      navigate('/', { replace: true })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const valid = preview && preview !== 'none' && preview.valid
  return (
    <div className="login">
      <div className="login-art">
        <div className="logo big">TC</div>
        <h2>You’re invited to the TotalCare survey</h2>
        <p lang="ar" dir="rtl" className="hero-ar">إنت مدعو لاستبيان TotalCare</p>
        <ul>
          <li>✔ About 8 minutes, Arabic or English</li>
          <li>✔ You can answer anonymously</li>
          <li>✔ No e-mail or password needed</li>
        </ul>
      </div>
      <div className="card login-card">
        <h1><KeyRound size={22} /> Join · انضم</h1>
        <p className="muted">Open the invitation link you received on WhatsApp, or type the code. <span lang="ar">افتح لينك الدعوة أو اكتب الكود.</span></p>
        <label>
          Invitation code · كود الدعوة
          <input className="mono" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. 7KQ2M9XHPA" autoComplete="off" />
        </label>
        {preview === 'none' && <p className="error">No invitation with this code. Check it and try again. · الكود ده مش موجود.</p>}
        {preview && preview !== 'none' && !preview.valid && <p className="error">This invitation was already used or has expired. Ask HR for a new one. · الدعوة دي اتستخدمت أو انتهت.</p>}
        {valid && (
          <>
            <p className="notice small">
              {preview.team ? 'Team invitation' : <>Welcome{preview.full_name ? <> <b>{preview.full_name}</b></> : ''}</>}
              {preview.department && <> · {preview.department}</>}
            </p>
            <label>
              Your full name · اسمك بالكامل
              <input dir="auto" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hassan Mahmoud" />
            </label>
          </>
        )}
        {error && <p className="error">{error}</p>}
        <button type="button" className="big" disabled={!valid || busy || name.trim().length < 3} onClick={join}>
          {busy ? 'Joining…' : <>Join and start <ArrowRight size={16} /></>}
        </button>
        <p className="muted small"><ShieldCheck size={13} /> This phone stays signed in, so keep using the same phone and browser. If you change phones, ask HR for a new link.</p>
        {session ? (
          <button type="button" className="link" onClick={() => supabase.auth.signOut()}><LogOut size={14} /> Sign out</button>
        ) : (
          <a className="link" href="/">I have a work e-mail — sign in instead</a>
        )}
      </div>
    </div>
  )
}
