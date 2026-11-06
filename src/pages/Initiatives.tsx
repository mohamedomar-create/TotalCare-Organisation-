import { useState } from 'react'
import { CalendarDays, Eye, EyeOff, Gift, Grid2x2, Hand, Heart, List, Plus, Rocket, Send, Target, Trash2, Trophy, User, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { STATUS, useInitiatives, type Initiative, type InitiativeStatus } from '../lib/initiatives'

const ORDER: InitiativeStatus[] = ['in_progress', 'approved', 'proposed', 'done', 'parked']

export default function Initiatives() {
  const { session, profile } = useAuth()
  const canManage = profile?.role === 'admin' || profile?.role === 'management'
  const { items, counts, mine, updates, loading, error, reload, toggle } = useInitiatives(session?.user.id)
  const [view, setView] = useState<'list' | 'matrix'>('list')
  const [editing, setEditing] = useState<Partial<Initiative> | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const shown = items.filter((i) => canManage || i.visible || i.created_by === session?.user.id)
  const winners = shown.filter((i) => i.rewarded)

  async function save(i: Partial<Initiative>) {
    const fields = { ...i }
    delete fields.id
    delete fields.created_at
    delete fields.updated_at
    delete fields.created_by
    if (!canManage) Object.assign(fields, { status: 'proposed', visible: false })
    const { error } = i.id ? await supabase.from('initiatives').update(fields).eq('id', i.id) : await supabase.from('initiatives').insert(fields)
    if (error) return setMsg(error.message)
    setEditing(null)
    setMsg(canManage ? 'Saved.' : 'Thank you — management will review your proposal.')
    void reload()
  }

  return (
    <div className="page wide">
      <div className="page-hero initiatives-hero">
        <div className="page-hero-inner">
          <Rocket size={40} />
          <div className="grow">
            <h1>You said, we did</h1>
            <p className="hero-ar" lang="ar">قلتوا… وعملنا</p>
            <p className="hero-sub">Every initiative comes from your survey answers, with an owner, a target and a deadline. Support the ones you care about, or volunteer to help.</p>
          </div>
          <button type="button" className="hero-cta" onClick={() => setEditing({ title: '', impact: 3, effort: 3, progress: 0, status: 'proposed', visible: canManage })}><Plus size={16} /> {canManage ? 'New initiative' : 'Propose one'}</button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {msg && <p className="notice" onClick={() => setMsg(null)}>{msg}</p>}

      {winners.length > 0 && (
        <section className="card winner-card">
          <h2><Trophy size={20} /> Winning ideas · الأفكار الفائزة</h2>
          {winners.map((w) => (
            <p key={w.id}>
              <b dir="auto">{w.title}</b>
              {w.reward_code && <> — reward code <span className="case-code small-code">{w.reward_code}</span>. <span className="muted small">If this is your code, contact HR to claim your reward. · لو ده الكود بتاعك كلّم الموارد البشرية.</span></>}
            </p>
          ))}
        </section>
      )}

      {canManage && (
        <div className="segmented" style={{ marginBottom: 14 }}>
          <button type="button" className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}><List size={15} /> By status</button>
          <button type="button" className={view === 'matrix' ? 'on' : ''} onClick={() => setView('matrix')}><Grid2x2 size={15} /> Impact × effort</button>
        </div>
      )}

      {loading ? <p className="muted">Loading…</p> : shown.length === 0 ? (
        <div className="card empty-state"><p>No initiatives yet. They’ll appear here once the survey results are in. <span lang="ar">لسه مفيش مبادرات.</span></p></div>
      ) : view === 'matrix' ? (
        <Matrix items={shown.filter((i) => i.status !== 'done' && i.status !== 'parked')} onOpen={setEditing} />
      ) : (
        ORDER.map((st) => {
          const list = shown.filter((i) => i.status === st)
          if (!list.length) return null
          return (
            <section key={st}>
              <h2><span className={`pill tone-${STATUS[st].tone}`}>{STATUS[st].label}</span> <span className="muted small" lang="ar">{STATUS[st].ar}</span> <span className="muted small">({list.length})</span></h2>
              <div className="initiative-grid">
                {list.map((i) => {
                  const c = counts.get(i.id)
                  const ups = updates.filter((u) => u.initiative_id === i.id)
                  return (
                    <article key={i.id} className={`card initiative ${i.visible ? '' : 'hidden-item'}`}>
                      <div className="row between">
                        <h3 dir="auto">{i.rewarded && <Trophy size={16} className="gold" />} {i.title}</h3>
                        {canManage && <button type="button" className="link" onClick={() => setEditing(i)}>Edit</button>}
                      </div>
                      {!i.visible && <span className="pill tone-slate"><EyeOff size={12} /> Not published yet</span>}
                      {i.description && <p className="pre small" dir="auto">{i.description}</p>}
                      <div className="initiative-meta small">
                        {i.owner_name && <span><User size={13} /> {i.owner_name}</span>}
                        {i.due_date && <span><CalendarDays size={13} /> by {new Date(i.due_date).toLocaleDateString()}</span>}
                        {i.kpi && <span><Target size={13} /> {i.kpi}{i.baseline && `: ${i.baseline}`}{i.target && ` → ${i.target}`}</span>}
                      </div>
                      <div className="progress"><div className="progress-bar" style={{ width: `${i.progress}%` }} /></div>
                      <p className="muted tiny">{i.progress}% done</p>
                      {ups.length > 0 && (
                        <ul className="timeline small">
                          {ups.slice(0, 3).map((u) => <li key={u.id}><span dir="auto">{u.body}</span>{u.progress !== null && <b> · {u.progress}%</b>} <span className="muted tiny">{new Date(u.created_at).toLocaleDateString()}</span></li>)}
                        </ul>
                      )}
                      {i.visible && i.status !== 'done' && (
                        <div className="row">
                          <button type="button" className={`secondary small-btn ${mine.has(`${i.id}:support`) ? 'on' : ''}`} onClick={() => void toggle(i.id, 'support')}><Heart size={14} /> {mine.has(`${i.id}:support`) ? 'Supported' : 'Support'} · {c?.supporters ?? 0}</button>
                          <button type="button" className={`secondary small-btn ${mine.has(`${i.id}:volunteer`) ? 'on' : ''}`} onClick={() => void toggle(i.id, 'volunteer')}><Hand size={14} /> {mine.has(`${i.id}:volunteer`) ? 'You’re in' : 'I’ll help'} · {c?.volunteers ?? 0}</button>
                        </div>
                      )}
                      {canManage && <UpdateBox initiative={i} onDone={reload} />}
                    </article>
                  )
                })}
              </div>
            </section>
          )
        })
      )}

      {editing && <Editor value={editing} canManage={canManage} onClose={() => setEditing(null)} onSave={save} onDelete={async (id) => { await supabase.from('initiatives').delete().eq('id', id); setEditing(null); void reload() }} />}
    </div>
  )
}

function UpdateBox({ initiative, onDone }: { initiative: Initiative; onDone: () => void }) {
  const [body, setBody] = useState('')
  const [progress, setProgress] = useState(initiative.progress)
  const [error, setError] = useState<string | null>(null)
  async function post() {
    const { error } = await supabase.from('initiative_updates').insert({ initiative_id: initiative.id, body, progress })
    if (error) return setError(error.message)
    setBody('')
    onDone()
  }
  return (
    <div className="update-box">
      <input dir="auto" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Post a progress update · تحديث" />
      <input type="range" min={0} max={100} step={5} value={progress} onChange={(e) => setProgress(Number(e.target.value))} title={`${progress}%`} />
      <span className="small">{progress}%</span>
      <button type="button" className="small-btn" disabled={!body.trim()} onClick={post}><Send size={13} /></button>
      {error && <p className="error small">{error}</p>}
    </div>
  )
}

function Matrix({ items, onOpen }: { items: Initiative[]; onOpen: (i: Initiative) => void }) {
  // Quick wins = high impact, low effort (top-left).
  return (
    <div className="card matrix-card">
      <div className="matrix">
        <span className="q q1">Quick wins · مكاسب سريعة</span>
        <span className="q q2">Big bets · رهانات كبيرة</span>
        <span className="q q3">Fill-ins</span>
        <span className="q q4">Think twice · فكّر تاني</span>
        {items.map((i, n) => (
          <button key={i.id} type="button" className={`dot-item tone-${STATUS[i.status].tone}`} title={`${i.title} — impact ${i.impact}, effort ${i.effort}`} onClick={() => onOpen(i)}
            style={{ left: `${((i.effort - 1) / 4) * 84 + 6 + (n % 3) * 2}%`, bottom: `${((i.impact - 1) / 4) * 80 + 8 + (n % 2) * 3}%` }}>
            {i.title.slice(0, 22)}{i.title.length > 22 ? '…' : ''}
          </button>
        ))}
        <span className="axis-x">Effort → · المجهود</span>
        <span className="axis-y">Impact → · التأثير</span>
      </div>
    </div>
  )
}

function Editor({ value, canManage, onClose, onSave, onDelete }: { value: Partial<Initiative>; canManage: boolean; onClose: () => void; onSave: (i: Partial<Initiative>) => void; onDelete: (id: string) => void }) {
  const [v, setV] = useState<Partial<Initiative>>(value)
  const set = (patch: Partial<Initiative>) => setV((x) => ({ ...x, ...patch }))
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{v.id ? 'Edit initiative' : canManage ? 'New initiative' : 'Propose an initiative'}</h2>
          <button type="button" className="icon-btn modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <label>Title<input dir="auto" value={v.title ?? ''} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Max 2 signatures for any order" /></label>
        <label>What and why<textarea rows={4} dir="auto" value={v.description ?? ''} onChange={(e) => set({ description: e.target.value })} /></label>
        {canManage && (
          <>
            <div className="two-fields">
              <label>Owner<input value={v.owner_name ?? ''} onChange={(e) => set({ owner_name: e.target.value })} placeholder="Who is responsible" /></label>
              <label>Status
                <select value={v.status ?? 'proposed'} onChange={(e) => set({ status: e.target.value as InitiativeStatus })}>
                  {(Object.keys(STATUS) as InitiativeStatus[]).map((s) => <option key={s} value={s}>{STATUS[s].label} · {STATUS[s].ar}</option>)}
                </select>
              </label>
            </div>
            <div className="two-fields">
              <label>Start<input type="date" value={v.start_date ?? ''} onChange={(e) => set({ start_date: e.target.value || null })} /></label>
              <label>Deadline<input type="date" value={v.due_date ?? ''} onChange={(e) => set({ due_date: e.target.value || null })} /></label>
            </div>
            <label>KPI — how we’ll know it worked<input value={v.kpi ?? ''} onChange={(e) => set({ kpi: e.target.value })} placeholder="e.g. Days from request to approval" /></label>
            <div className="two-fields">
              <label>Today<input value={v.baseline ?? ''} onChange={(e) => set({ baseline: e.target.value })} placeholder="e.g. 5 days" /></label>
              <label>Target<input value={v.target ?? ''} onChange={(e) => set({ target: e.target.value })} placeholder="e.g. 2 days" /></label>
            </div>
            <div className="two-fields">
              <label>Impact {v.impact}/5<input type="range" min={1} max={5} value={v.impact ?? 3} onChange={(e) => set({ impact: Number(e.target.value) })} /></label>
              <label>Effort {v.effort}/5<input type="range" min={1} max={5} value={v.effort ?? 3} onChange={(e) => set({ effort: Number(e.target.value) })} /></label>
            </div>
            <label className="inline-check"><input type="checkbox" checked={Boolean(v.visible)} onChange={(e) => set({ visible: e.target.checked })} /> {v.visible ? <Eye size={14} /> : <EyeOff size={14} />} Published to all staff</label>
            <label className="inline-check"><input type="checkbox" checked={Boolean(v.rewarded)} onChange={(e) => set({ rewarded: e.target.checked })} /> <Gift size={14} /> Winning idea (shown with its reward code if the author was anonymous)</label>
            {v.source && <p className="muted small">Source: {v.source}</p>}
          </>
        )}
        <div className="row between">
          {v.id && canManage ? <button type="button" className="link danger" onClick={() => confirm('Delete this initiative?') && onDelete(v.id!)}><Trash2 size={14} /> Delete</button> : <span />}
          <button type="button" disabled={!v.title?.trim() || (v.title?.trim().length ?? 0) < 3} onClick={() => onSave(v)}>{canManage ? 'Save' : 'Send proposal'}</button>
        </div>
      </div>
    </div>
  )
}
