import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock, RotateCcw, Trash2, Unlock } from 'lucide-react'
import { supabase } from '../lib/supabase'

type FreshKey = 'answers' | 'messages' | 'invitations' | 'link_accounts' | 'initiatives'
const FRESH: { key: FreshKey; label: string; ar: string; help: string }[] = [
  { key: 'answers', label: 'Survey answers', ar: 'إجابات الاستبيان', help: 'Every answer and draft, who took part, and extra-survey allowances.' },
  { key: 'messages', label: 'Speak-up messages and feedback', ar: 'رسائل قول رأيك والملاحظات', help: 'Anonymous speak-up cases and app feedback notes.' },
  { key: 'invitations', label: 'Invitations', ar: 'الدعوات', help: 'All invitation links and e-mail invitations — used, waiting or cancelled.' },
  { key: 'link_accounts', label: 'Accounts that joined by link', ar: 'الحسابات اللي دخلت باللينك', help: 'Phones that joined with an invitation link. Answers they sent with their name go too; anonymous answers stay unless you also choose survey answers.' },
  { key: 'initiatives', label: 'Initiatives', ar: 'المبادرات', help: 'Initiatives with their supporters and progress updates.' },
]

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

  const [pick, setPick] = useState<Record<FreshKey, boolean>>({ answers: true, messages: false, invitations: false, link_accounts: false, initiatives: false })
  const [counts, setCounts] = useState<Record<FreshKey, number> | null>(null)
  const loadCounts = useCallback(async () => {
    const n = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0
    const head = { count: 'exact' as const, head: true }
    const [answers, voice, feedback, invitations, link_accounts, initiatives] = await Promise.all([
      n(supabase.from('submissions').select('id', head)),
      n(supabase.from('safe_voice').select('id', head)),
      n(supabase.from('feedback').select('id', head)),
      n(supabase.from('invitations').select('id', head)),
      n(supabase.from('profiles').select('id', head).like('email', '%@invite.local')),
      n(supabase.from('initiatives').select('id', head)),
    ])
    setCounts({ answers, messages: voice + feedback, invitations, link_accounts, initiatives })
  }, [])
  useEffect(() => { void loadCounts() }, [loadCounts])

  async function startFresh() {
    const chosen = FRESH.filter((o) => pick[o.key]).map((o) => o.label.toLowerCase()).join(', ')
    if (!confirm(`Delete ${chosen}? This can’t be undone.`)) return
    setBusy(true)
    const { data, error } = await supabase.rpc('admin_start_fresh', {
      p_confirm: typed.trim(), p_answers: pick.answers, p_messages: pick.messages, p_invitations: pick.invitations,
      p_link_accounts: pick.link_accounts, p_initiatives: pick.initiatives,
    })
    setBusy(false)
    setTyped('')
    if (error) return setNotice({ ok: false, text: /admin_start_fresh/.test(error.message) ? 'Run supabase/migrations/0015_start_fresh.sql first.' : error.message })
    const d = data as Record<FreshKey, number>
    setNotice({ ok: true, text: `Deleted: ${FRESH.filter((o) => pick[o.key]).map((o) => `${d[o.key] ?? 0} ${o.label.toLowerCase()}`).join(', ')}.` })
    await loadCounts()
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
          <h2><RotateCcw size={18} /> Surveys per person <span className="ar-title" lang="ar">عدد الاستبيانات لكل شخص</span></h2>
          <p className="muted small">Normally 1. Raise it only to run a new round later (for example next year): everyone can then send one more. To let just one person send again, use <Link to="/admin/users">Users & roles → +1</Link>.</p>
        </div>
        <div className="row">
          <button type="button" className="secondary small-btn" disabled={busy || s.submissions_per_person <= 1} onClick={() => void save({ submissions_per_person: s.submissions_per_person - 1 }, 'Saved.')}>−</button>
          <b className="setting-number">{s.submissions_per_person}</b>
          <button type="button" className="secondary small-btn" disabled={busy} onClick={() => confirm('Let everyone send one more survey?') && void save({ submissions_per_person: s.submissions_per_person + 1 }, 'Saved: everyone can send one more survey.')}>+</button>
        </div>
      </section>

      <section className="card danger-zone start-fresh">
        <h2><Trash2 size={18} /> Start fresh <span className="ar-title" lang="ar">ابدأ من جديد</span></h2>
        <p className="muted small">Choose what to delete. Your super admin account, other e-mail accounts, departments and settings are always kept. This can’t be undone.</p>
        <div className="fresh-options">
          {FRESH.map((o) => (
            <label key={o.key} className={`fresh-option ${pick[o.key] ? 'on' : ''}`}>
              <input type="checkbox" checked={pick[o.key]} onChange={(e) => setPick({ ...pick, [o.key]: e.target.checked })} />
              <span className="grow"><b>{o.label}</b> <span className="muted small" lang="ar">· {o.ar}</span><span className="muted small block">{o.help}</span></span>
              <span className="fresh-count">{counts ? counts[o.key] : '…'}</span>
            </label>
          ))}
        </div>
        <div className="row">
          <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Type DELETE" aria-label="Type DELETE to confirm" style={{ width: 150 }} />
          <button type="button" className="danger" disabled={busy || typed.trim() !== 'DELETE' || !Object.values(pick).some(Boolean)} onClick={() => void startFresh()}><Trash2 size={15} /> Delete the selected records</button>
        </div>
      </section>
    </div>
  )
}
