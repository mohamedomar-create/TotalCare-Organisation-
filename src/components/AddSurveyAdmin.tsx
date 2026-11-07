import { useState } from 'react'
import { Copy, MessageCircle, UserPlus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { newInviteCode, whatsappNumber } from '../lib/invites'
import type { Profile } from '../lib/types'

/**
 * The super admin adds a survey admin by e-mail or mobile, whether or not they have signed in yet.
 * Existing account → role changes now. Otherwise an invitation carries the role:
 * an e-mail invitation applies it at first sign-in, a link invitation when the link is opened.
 */
export default function AddSurveyAdmin({ users, onDone }: { users: Profile[]; onDone: () => void }) {
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ text: string; link?: string; phone?: string } | null>(null)
  const [copied, setCopied] = useState(false)

  async function add(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResult(null)
    const c = contact.trim()
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c)
    const isPhone = /^\+?[\d\s-]{8,}$/.test(c)
    if (name.trim().length < 3) return setError('Write their full name. · اكتب الاسم بالكامل')
    if (!isEmail && !isPhone) return setError('Write their e-mail or WhatsApp number. · اكتب الإيميل أو رقم الواتساب')
    setBusy(true)
    try {
      const existing = isEmail ? users.find((u) => u.email.toLowerCase() === c.toLowerCase()) : undefined
      if (existing) {
        if (existing.role === 'admin') throw new Error('This person is already a super admin.')
        const { error } = await supabase.from('profiles').update({ role: 'distributor' }).eq('id', existing.id)
        if (error) throw new Error(error.message)
        setResult({ text: `${existing.full_name || existing.email} is now a survey admin. They’ll see Invitations and Coverage next time they open the site.` })
      } else {
        const code = newInviteCode()
        const { error } = await supabase.from('invitations').insert({
          code, full_name: name.trim(), role: 'distributor',
          email: isEmail ? c.toLowerCase() : null, phone: isPhone ? c : '',
          expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
        })
        if (error) throw new Error(/invitations_email_open|duplicate/.test(error.message) ? 'This e-mail already has an open invitation. Cancel it on the Invitations page first.' : error.message)
        const link = `${window.location.origin}/join/${code}`
        setResult(isEmail
          ? { text: `Done. When ${name.trim()} signs in with ${c.toLowerCase()} at ${window.location.origin}, they become a survey admin. You can also send them this link:`, link }
          : { text: `Send this link to ${name.trim()} on WhatsApp. When they open it, they become a survey admin. The link is personal and works once.`, link, phone: c })
      }
      setName('')
      setContact('')
      onDone()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const message = result?.link ? `أهلاً 👋 اتعينت مسؤول توزيع استبيان TotalCare. افتح اللينك ده:\nYou’re now a TotalCare survey admin. Open this link:\n${result.link}` : ''
  return (
    <form className="card add-admin" onSubmit={add}>
      <h2><UserPlus size={18} /> Add a survey admin · إضافة مسؤول توزيع</h2>
      <p className="muted small">A survey admin sends the survey to everyone (invitation links, WhatsApp, who hasn’t answered yet). They can’t see any answers or results.</p>
      <div className="two-fields">
        <label>Full name · الاسم<input dir="auto" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nour Hassan" /></label>
        <label>E-mail or WhatsApp number · الإيميل أو الواتساب<input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="nour@totalcareegypt.com or 010…" /></label>
      </div>
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={busy}><UserPlus size={15} /> {busy ? 'Adding…' : 'Add survey admin'}</button>
      {result && (
        <div className="notice add-admin-result">
          <p>{result.text}</p>
          {result.link && (
            <>
              <p className="mono everyone-url">{result.link}</p>
              <div className="row">
                {result.phone && <a className="button" href={`https://wa.me/${whatsappNumber(result.phone)}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer"><MessageCircle size={15} /> Send on WhatsApp</a>}
                <button type="button" className="secondary" onClick={() => { void navigator.clipboard?.writeText(message); setCopied(true) }}><Copy size={15} /> {copied ? 'Copied' : 'Copy message'}</button>
              </div>
            </>
          )}
        </div>
      )}
    </form>
  )
}
