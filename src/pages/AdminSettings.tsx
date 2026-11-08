import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, Lock, RotateCcw, Trash2, Unlock } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Settings { submissions_per_person: number; invite_only: boolean; results_published: boolean }

/** The few switches the super admin needs, in one place, in plain words. */
export default function AdminSettings() {
  const [s, setS] = useState<Settings | null>(null)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('app_settings').select('submissions_per_person, invite_only, results_published').eq('id', 1).maybeSingle()
    if (error) return setNotice({ ok: false, text: error.message })
    setS(data as Settings)
  }, [])
  useEffect(() => { void load() }, [load])

  async function save(patch: Partial<Settings>, done: string) {
    setBusy(true)
    const { error } = patch.results_published !== undefined
      ? await supabase.rpc('set_results_published', { p_on: patch.results_published })
      : await supabase.from('app_settings').update(patch).eq('id', 1)
    setBusy(false)
    setNotice(error ? { ok: false, text: error.message } : { ok: true, text: done })
    await load()
  }

  async function resetAll() {
    if (typed.trim() !== 'RESET') return setNotice({ ok: false, text: 'Type RESET in capitals to confirm.' })
    setBusy(true)
    const { error } = await supabase.rpc('admin_reset_data', { p_confirm: 'RESET' })
    setBusy(false)
    setTyped('')
    setNotice(error ? { ok: false, text: error.message } : { ok: true, text: 'All answers, speak-up messages and feedback were deleted. Invitations and accounts are kept.' })
  }

  if (!s) return <div className="page"><p className="muted">Loading…</p>{notice && <p className="error">{notice.text}</p>}</div>
  return (
    <div className="page settings-page">
      <h1>Settings <span className="ar-title" lang="ar">الإعدادات</span></h1>
      {notice && <p className={notice.ok ? 'notice' : 'error'} onClick={() => setNotice(null)}>{notice.text}</p>}

      <section className="card setting">
        <div className="setting-text">
          <h2>{s.invite_only ? <Lock size={18} /> : <Unlock size={18} />} Who can answer <span className="ar-title" lang="ar">مين يقدر يجاوب</span></h2>
          <p className="muted small">{s.invite_only
            ? 'Only people you invited. Each invitation works once, so answers can never be more than the people you invited.'
            : 'Anyone with a company e-mail, plus people you invited. Shared mailboxes could add extra answers.'}</p>
        </div>
        <div className="segmented">
          <button type="button" className={s.invite_only ? 'on' : ''} disabled={busy} onClick={() => void save({ invite_only: true }, 'Only invited people can answer now.')}>Invited people only</button>
          <button type="button" className={!s.invite_only ? 'on' : ''} disabled={busy} onClick={() => void save({ invite_only: false }, 'Company e-mails can join without an invitation now.')}>Also any company e-mail</button>
        </div>
      </section>

      <section className="card setting">
        <div className="setting-text">
          <h2>{s.results_published ? <Eye size={18} /> : <EyeOff size={18} />} Results for everyone <span className="ar-title" lang="ar">النتايج للكل</span></h2>
          <p className="muted small">{s.results_published
            ? 'Everyone can open the results page (combined numbers only, no names on answers).'
            : 'Only you and management can see the results page. Share it when the survey closes, so early results don’t sway the answers.'}{' '}
            <Link to="/results">Open the results page</Link></p>
        </div>
        <div className="segmented">
          <button type="button" className={!s.results_published ? 'on' : ''} disabled={busy} onClick={() => void save({ results_published: false }, 'Results are private again.')}>Private</button>
          <button type="button" className={s.results_published ? 'on' : ''} disabled={busy} onClick={() => void save({ results_published: true }, 'Results are now shared with everyone.')}>Shared with everyone</button>
        </div>
      </section>

      <section className="card setting">
        <div className="setting-text">
          <h2><RotateCcw size={18} /> Surveys per person <span className="ar-title" lang="ar">عدد الاستبيانات لكل شخص</span></h2>
          <p className="muted small">Normally 1. Raise it only to run a new round later (for example next year): everyone can then send one more. To let just one person send again, use <Link to="/admin/users">Users & roles → +1</Link>.</p>
        </div>
        <div className="row">
          <button type="button" className="secondary small-btn" disabled={busy || s.submissions_per_person <= 1} onClick={() => void save({ submissions_per_person: s.submissions_per_person - 1 }, 'Saved.')}>−</button>
          <b className="setting-number">{s.submissions_per_person}</b>
          <button type="button" className="secondary small-btn" disabled={busy} onClick={() => confirm('Let everyone send one more survey?') && void save({ submissions_per_person: s.submissions_per_person + 1 }, 'Saved: everyone can send one more survey.')}>+</button>
        </div>
      </section>

      <section className="card setting danger-zone">
        <div className="setting-text">
          <h2><Trash2 size={18} /> Delete all answers <span className="ar-title" lang="ar">مسح كل الإجابات</span></h2>
          <p className="muted small">Deletes every survey answer, speak-up message and feedback note — use it once to remove test answers before the real survey. Invitations, accounts and settings are kept. This can’t be undone.</p>
        </div>
        <div className="row">
          <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Type RESET" aria-label="Type RESET to confirm" style={{ width: 140 }} />
          <button type="button" className="danger" disabled={busy || typed.trim() !== 'RESET'} onClick={() => void resetAll()}><Trash2 size={15} /> Delete everything</button>
        </div>
      </section>
    </div>
  )
}
