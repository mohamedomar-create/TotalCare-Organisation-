import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, KeyRound, LogOut, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { createSubmission } from '../lib/submissions'

interface Preview {
  full_name: string
  department: string
  valid: boolean
  team: boolean
}

/**
 * Joining with an invitation link: one tap and the person is in the survey.
 * The phone is signed in anonymously, the invitation turns it into a member, and a survey draft opens.
 * Typing the code by hand still works for people who only have the code.
 */
export default function Join() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session, profile, refreshProfile } = useAuth()
  const fromPath = location.pathname.match(/^\/join\/([^/?#]+)/)?.[1]
  const [code, setCode] = useState(decodeURIComponent(fromPath ?? '').toUpperCase())
  const [preview, setPreview] = useState<Preview | null | 'none'>(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fromLink = Boolean(fromPath)

  // A company e-mail that was invited after it first signed in: pick up the invitation now.
  const mailbox = profile && profile.active === false && !profile.email.endsWith('@invite.local') ? profile.email : ''
  const [checkedMail, setCheckedMail] = useState(false)
  useEffect(() => {
    if (!mailbox) return
    void supabase.rpc('claim_email_invitation').then(async () => {
      await refreshProfile()
      setCheckedMail(true)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mailbox])

  useEffect(() => {
    const c = code.trim()
    if (c.length < 6) return setPreview(null)
    const t = setTimeout(() => {
      supabase.rpc('invite_preview', { p_code: c }).then(({ data, error }) => {
        if (error) return setError(error.message)
        const row = (Array.isArray(data) ? data[0] : data) as Preview | undefined
        setPreview(row ?? 'none')
      })
    }, fromLink ? 0 : 250)
    return () => clearTimeout(t)
  }, [code, fromLink])

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
      // Straight into the survey: reuse a draft, or start one. If they already answered, go home.
      const { data: who } = await supabase.auth.getUser()
      const { data: mine } = await supabase.from('submissions').select('id, status').eq('author_id', who.user?.id ?? '').order('created_at', { ascending: false })
      const draft = ((mine ?? []) as { id: string; status: string }[]).find((s) => s.status === 'draft')
      let target = '/'
      if (draft) target = `/vision/${draft.id}`
      else if (!(mine ?? []).length) {
        try {
          target = `/vision/${await createSubmission()}`
        } catch {
          target = '/' // already answered (e.g. anonymously): the home page says so
        }
      }
      navigate(target, { replace: true })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const valid = preview && preview !== 'none' && preview.valid
  const greeting = valid && preview.full_name ? preview.full_name.split(' ')[0] : ''
  return (
    <div className="login join">
      <div className="login-art">
        <div className="logo big">TC</div>
        <h2>You’re invited to the TotalCare survey</h2>
        <p lang="ar" dir="rtl" className="hero-ar">إنت مدعو لاستبيان TotalCare</p>
        <ul>
          <li>✔ About 10 minutes, Arabic or English</li>
          <li>✔ You can answer anonymously</li>
          <li>✔ No e-mail or password needed</li>
        </ul>
      </div>
      <div className="card login-card">
        {valid ? (
          <>
            <h1>{greeting ? `Welcome, ${greeting} 👋` : 'Welcome 👋'}</h1>
            {preview.full_name && !preview.team && (
              <p className="notice small join-personal">This link is only for <b dir="auto">{preview.full_name}</b>. It works once, on one phone. Not you? Please don’t continue — ask HR for your own link. <span lang="ar" dir="rtl">اللينك ده لـ {preview.full_name} بس. لو مش انت متكملش.</span></p>
            )}
            <p className="lead" lang="ar" dir="rtl">{greeting ? `أهلاً ${greeting}` : 'أهلاً بيك'} — دوس على الزرار وابدأ الاستبيان.</p>
            {preview.department && <p className="muted small">{preview.department}</p>}
            {!preview.full_name && (
              <label>
                Your name <span className="muted">(optional) · اسمك (اختياري)</span>
                <input dir="auto" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hassan Mahmoud" autoComplete="name" />
              </label>
            )}
            {error && <p className="error">{error}</p>}
            <button type="button" className="big join-start" disabled={busy} onClick={join}>
              {busy ? 'Opening the survey…' : <>{greeting && !preview.team ? `I’m ${greeting} — start the survey` : 'Start the survey'} · ابدأ الاستبيان <ArrowRight size={18} /></>}
            </button>
            <p className="muted small"><ShieldCheck size={13} /> Your name is never shown with your answers if you choose “anonymously” at the end. Keep using this phone and browser to come back to your answers.</p>
          </>
        ) : (
          <>
            <h1><KeyRound size={22} /> Invitation · دعوة</h1>
            {fromLink && preview === null && !error && <p className="muted">Checking your link… · لحظة…</p>}
            {preview === 'none' && <p className="error">This link or code isn’t right. Check it, or ask HR for a new one. · اللينك ده مش صحيح.</p>}
            {preview && preview !== 'none' && !preview.valid && <p className="error">This link was already opened on another phone, or has expired. Each link works only once, for one person. If it’s yours and you didn’t open it, ask HR for a new one. · اللينك ده اتفتح قبل كده على موبايل تاني أو انتهى. كل لينك بيشتغل مرة واحدة.</p>}
            {mailbox && checkedMail && !fromLink && <p className="notice small">You’re signed in as <b>{mailbox}</b>, but this e-mail isn’t on the invitation list yet. Ask HR to invite it, then open the site again. · الإيميل ده لسه مش في قايمة الدعوات.</p>}
            {(!fromLink || preview === 'none' || (preview && !preview.valid)) && (
              <label>
                Invitation code · كود الدعوة
                <input className="mono" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. 7KQ2M9XHPA" autoComplete="off" />
              </label>
            )}
            {error && <p className="error">{error}</p>}
          </>
        )}
        {session ? (
          <button type="button" className="link" onClick={() => supabase.auth.signOut()}><LogOut size={14} /> Sign out</button>
        ) : (
          <a className="link small" href="/" onClick={(e) => { e.preventDefault(); navigate('/') }}>I have a work e-mail — sign in instead</a>
        )}
      </div>
    </div>
  )
}
