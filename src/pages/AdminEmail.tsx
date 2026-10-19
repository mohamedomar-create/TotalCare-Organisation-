import { useEffect, useState } from 'react'
import { CheckCircle2, Mail, Send, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Settings {
  notify_submissions: boolean
  notify_feedback: boolean
  notify_reports: boolean
  digest: 'off' | 'daily' | 'weekly'
  extra_recipients: string[]
  app_url: string
}

interface LogRow {
  id: string
  kind: string
  subject: string
  recipients: string[]
  status: 'sent' | 'failed' | 'skipped'
  error: string
  created_at: string
}

const KIND_LABEL: Record<string, string> = {
  submission: 'Submission',
  feedback: 'Feedback',
  digest: 'Summary',
  report: 'Report to management',
  test: 'Test',
}

function Toggle({ checked, onChange, title, hint }: { checked: boolean; onChange: (v: boolean) => void; title: string; hint: string }) {
  return (
    <label className="toggle-row">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <strong>{title}</strong>
        <span className="muted small">{hint}</span>
      </span>
    </label>
  )
}

export default function AdminEmail() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [extra, setExtra] = useState('')
  const [log, setLog] = useState<LogRow[]>([])
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  async function loadLog() {
    const { data } = await supabase.from('email_log').select('*').order('created_at', { ascending: false }).limit(30)
    setLog((data ?? []) as LogRow[])
  }

  useEffect(() => {
    supabase
      .from('notification_settings')
      .select('*')
      .eq('id', 1)
      .single()
      .then(({ data, error }) => {
        if (error) return setMessage({ ok: false, text: error.message })
        const s = data as Settings
        // First visit: remember where the app lives so e-mails can link back to it.
        if (!s.app_url) s.app_url = window.location.origin
        setSettings(s)
        setExtra(s.extra_recipients.join(', '))
      })
    void loadLog()
  }, [])

  async function save(next: Settings) {
    setSettings(next)
    const { error } = await supabase
      .from('notification_settings')
      .update({ ...next, updated_at: new Date().toISOString() })
      .eq('id', 1)
    setMessage(error ? { ok: false, text: error.message } : { ok: true, text: 'Settings saved' })
  }

  async function run(type: 'test' | 'digest_now') {
    setBusy(type)
    setMessage(null)
    const { data, error } = await supabase.functions.invoke('notify', { body: { type } })
    setBusy(null)
    if (error) setMessage({ ok: false, text: error.message })
    else if (data?.sent) setMessage({ ok: true, text: type === 'test' ? `Test e-mail sent to ${(data.recipients ?? []).join(', ')}` : 'Summary sent' })
    else setMessage({ ok: false, text: `Not sent: ${data?.reason ?? 'unknown reason'}` })
    await loadLog()
  }

  if (!settings) return <div className="page">{message ? <p className="error">{message.text}</p> : <p className="muted">Loading…</p>}</div>

  return (
    <div className="page">
      <h1>E-mail</h1>
      <p className="muted">
        E-mails go to every admin, plus any extra addresses below. Submission and feedback e-mails include names, so only add
        people who are allowed to see them.
      </p>

      <section className="card">
        <h2>What to send</h2>
        <Toggle checked={settings.notify_submissions} onChange={(v) => save({ ...settings, notify_submissions: v })} title="Every new submission" hint="Sent the moment someone presses Send, with all their answers." />
        <Toggle checked={settings.notify_feedback} onChange={(v) => save({ ...settings, notify_feedback: v })} title="Every quick feedback note" hint="Ideas, problems, questions and thanks from the Send feedback button." />
        <Toggle checked={settings.notify_reports} onChange={(v) => save({ ...settings, notify_reports: v })} title="Tell management when a report is published" hint="Goes to management users. Contains no names — only the anonymised summary you published." />
        <p className="field-label">Summary of all results</p>
        <div className="segmented">
          {(['off', 'daily', 'weekly'] as const).map((d) => (
            <button key={d} type="button" className={settings.digest === d ? 'active' : ''} onClick={() => save({ ...settings, digest: d })}>
              {d === 'off' ? 'Off' : d === 'daily' ? 'Every day' : 'Every Sunday'}
            </button>
          ))}
        </div>
        <p className="muted small">
          Sent at 7:00 am Cairo time: response rate, average scores, top problems, eNPS, new ideas, and the list of new
          submissions and feedback.
        </p>
      </section>

      <section className="card">
        <h2>Recipients</h2>
        <label>
          Extra e-mail addresses <span className="muted">(comma separated, optional)</span>
          <input
            value={extra}
            placeholder="hr@totalcareegypt.com"
            onChange={(e) => setExtra(e.target.value)}
            onBlur={() => save({ ...settings, extra_recipients: extra.split(',').map((x) => x.trim()).filter(Boolean) })}
          />
        </label>
        <label>
          App address used in e-mail links
          <input value={settings.app_url} onChange={(e) => setSettings({ ...settings, app_url: e.target.value })} onBlur={() => save(settings)} />
        </label>
        <div className="row">
          <button type="button" onClick={() => run('test')} disabled={busy !== null}><Mail size={16} /> {busy === 'test' ? 'Sending…' : 'Send test e-mail'}</button>
          <button type="button" className="secondary" onClick={() => run('digest_now')} disabled={busy !== null}><Send size={16} /> {busy === 'digest_now' ? 'Sending…' : 'Send summary now'}</button>
        </div>
        {message && <p className={message.ok ? 'success-text' : 'error'}>{message.text}</p>}
      </section>

      <section className="card">
        <h2>Recent e-mails</h2>
        {log.length === 0 ? (
          <p className="muted small">Nothing sent yet.</p>
        ) : (
          <ul className="email-log">
            {log.map((l) => (
              <li key={l.id}>
                {l.status === 'sent' ? <CheckCircle2 size={16} className="success-icon" /> : <XCircle size={16} className={l.status === 'failed' ? 'error' : 'muted'} />}
                <div className="grow">
                  <strong>{l.subject || KIND_LABEL[l.kind]}</strong>
                  <div className="muted small">
                    {KIND_LABEL[l.kind] ?? l.kind} · {new Date(l.created_at).toLocaleString()} · {l.recipients.length ? l.recipients.join(', ') : 'no recipients'}
                    {l.status !== 'sent' && ` · ${l.status}${l.error ? ': ' + l.error : ''}`}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
