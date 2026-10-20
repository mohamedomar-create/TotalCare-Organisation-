import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Gift, Megaphone, Pin, Sparkles, Trash2, Vote, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { timeAgo, useStaff, type Announcement, type Poll, type Redemption, type Reward } from '../lib/community'

type Tab = 'requests' | 'rewards' | 'news' | 'polls' | 'points'

export default function AdminCommunity() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const staff = useStaff()
  const names = useMemo(() => new Map(staff.map((s) => [s.id, s.full_name])), [staff])
  const [tab, setTab] = useState<Tab>(isAdmin ? 'requests' : 'news')
  const [requests, setRequests] = useState<Redemption[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [news, setNews] = useState<Announcement[]>([])
  const [polls, setPolls] = useState<Poll[]>([])
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    const [r, w, n, p] = await Promise.all([
      isAdmin ? supabase.from('redemptions').select('*').order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
      isAdmin ? supabase.from('rewards').select('*').order('cost') : Promise.resolve({ data: [] }),
      supabase.from('announcements').select('*').order('created_at', { ascending: false }),
      isAdmin ? supabase.from('polls').select('*').order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
    ])
    setRequests((r.data ?? []) as Redemption[])
    setRewards((w.data ?? []) as Reward[])
    setNews((n.data ?? []) as Announcement[])
    setPolls((p.data ?? []) as Poll[])
  }, [isAdmin])
  useEffect(() => {
    void load()
  }, [load])

  const run = async (op: PromiseLike<{ error: { message: string } | null }>, ok: string) => {
    const { error } = await op
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: ok })
    await load()
  }

  /* forms */
  const [newsForm, setNewsForm] = useState({ title: '', body: '', pinned: false })
  const [rewardForm, setRewardForm] = useState({ title: '', title_ar: '', description: '', cost: 200, emoji: '🎁' })
  const [pollForm, setPollForm] = useState({ question: '', question_ar: '', options: '😞,🙁,😐,🙂,😄' })
  const [award, setAward] = useState({ user: '', points: 50, reason: 'Great contribution — thank you!' })
  const pending = requests.filter((r) => r.status === 'pending')

  const tabs: { key: Tab; label: string; icon: React.ReactNode; admin?: boolean; badge?: number }[] = [
    { key: 'requests', label: 'Reward requests', icon: <Gift size={16} />, admin: true, badge: pending.length },
    { key: 'rewards', label: 'Rewards shop', icon: <Sparkles size={16} />, admin: true },
    { key: 'news', label: 'Announcements', icon: <Megaphone size={16} /> },
    { key: 'polls', label: 'Pulse polls', icon: <Vote size={16} />, admin: true },
    { key: 'points', label: 'Award points', icon: <Check size={16} />, admin: true },
  ]

  return (
    <div className="page wide">
      <h1>Community</h1>
      <p className="muted">Run the rewards, news and polls that keep the team engaged.</p>
      <div className="tabs">
        {tabs.filter((t) => !t.admin || isAdmin).map((t) => (
          <button key={t.key} className={tab === t.key ? 'active' : ''} onClick={() => setTab(t.key)}>{t.icon} {t.label} {t.badge ? <span className="badge">{t.badge}</span> : null}</button>
        ))}
      </div>
      {msg && <p className={msg.ok ? 'success-text' : 'error'}>{msg.text}</p>}

      {tab === 'requests' && (
        <ul className="list">
          {requests.map((r) => (
            <li key={r.id} className={`card list-row ${r.status === 'pending' ? 'unread' : ''}`}>
              <span className="reward-emoji small">{rewards.find((w) => w.id === r.reward_id)?.emoji ?? '🎁'}</span>
              <div className="grow">
                <strong>{names.get(r.user_id) ?? 'Someone'}</strong> wants <strong>{rewards.find((w) => w.id === r.reward_id)?.title ?? 'a reward'}</strong>
                <div className="muted small">{r.cost} points · {timeAgo(r.created_at)}</div>
              </div>
              {r.status === 'pending' ? (
                <>
                  <button className="small-btn" onClick={() => run(supabase.rpc('decide_redemption', { p_id: r.id, p_approve: true }), 'Approved — please arrange the reward with them.')}><Check size={14} /> Approve</button>
                  <button className="secondary small-btn" onClick={() => run(supabase.rpc('decide_redemption', { p_id: r.id, p_approve: false }), 'Returned — the points went back to them.')}><X size={14} /> Return points</button>
                </>
              ) : (
                <span className={`status-pill tone-${r.status === 'approved' ? 'green' : 'rose'}`}>{r.status === 'approved' ? 'Approved' : 'Returned'}</span>
              )}
            </li>
          ))}
          {requests.length === 0 && <p className="muted">No requests yet.</p>}
        </ul>
      )}

      {tab === 'rewards' && (
        <div className="dash-grid">
          <form className="card" onSubmit={(e) => { e.preventDefault(); void run(supabase.from('rewards').insert(rewardForm), 'Reward added'); setRewardForm({ ...rewardForm, title: '', title_ar: '', description: '' }) }}>
            <h2>Add a reward</h2>
            <div className="two-fields">
              <label>Emoji<input value={rewardForm.emoji} maxLength={4} onChange={(e) => setRewardForm({ ...rewardForm, emoji: e.target.value })} /></label>
              <label>Cost (points)<input type="number" min={1} value={rewardForm.cost} onChange={(e) => setRewardForm({ ...rewardForm, cost: Number(e.target.value) })} /></label>
            </div>
            <label>Title<input required value={rewardForm.title} onChange={(e) => setRewardForm({ ...rewardForm, title: e.target.value })} /></label>
            <label>العنوان بالعربي<input dir="rtl" value={rewardForm.title_ar} onChange={(e) => setRewardForm({ ...rewardForm, title_ar: e.target.value })} /></label>
            <label>Description<input value={rewardForm.description} onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })} /></label>
            <button type="submit">Add reward</button>
          </form>
          <section className="card">
            <h2>Current rewards</h2>
            <ul className="history">
              {rewards.map((w) => (
                <li key={w.id}>
                  <span>{w.emoji} {w.title} <small className="muted">· {w.cost} pts{!w.active && ' · hidden'}</small></span>
                  <span className="row">
                    <button className="link small" onClick={() => run(supabase.from('rewards').update({ active: !w.active }).eq('id', w.id), w.active ? 'Hidden from the shop' : 'Back in the shop')}>{w.active ? 'Hide' : 'Show'}</button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {tab === 'news' && (
        <div className="dash-grid">
          <form className="card" onSubmit={(e) => { e.preventDefault(); void run(supabase.from('announcements').insert(newsForm), 'Posted to the home page'); setNewsForm({ title: '', body: '', pinned: false }) }}>
            <h2>Post an announcement</h2>
            <label>Title<input required dir="auto" value={newsForm.title} onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })} /></label>
            <label>Message<textarea rows={4} dir="auto" value={newsForm.body} onChange={(e) => setNewsForm({ ...newsForm, body: e.target.value })} /></label>
            <label className="inline"><input type="checkbox" checked={newsForm.pinned} onChange={(e) => setNewsForm({ ...newsForm, pinned: e.target.checked })} /> Pin to the top</label>
            <button type="submit"><Megaphone size={15} /> Post</button>
          </form>
          <section className="card">
            <h2>Posted</h2>
            <ul className="history">
              {news.map((n) => (
                <li key={n.id}>
                  <span>{n.pinned && <Pin size={13} />} {n.title}<small className="muted"> · {timeAgo(n.created_at)}</small></span>
                  <span className="row">
                    <button className="link small" onClick={() => run(supabase.from('announcements').update({ pinned: !n.pinned }).eq('id', n.id), 'Updated')}>{n.pinned ? 'Unpin' : 'Pin'}</button>
                    <button className="icon-btn danger" aria-label="Delete" onClick={() => confirm('Delete this announcement?') && run(supabase.from('announcements').delete().eq('id', n.id), 'Deleted')}><Trash2 size={14} /></button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {tab === 'polls' && (
        <div className="dash-grid">
          <form
            className="card"
            onSubmit={async (e) => {
              e.preventDefault()
              await supabase.from('polls').update({ active: false }).eq('active', true)
              await run(supabase.from('polls').insert({ question: pollForm.question, question_ar: pollForm.question_ar, options: pollForm.options.split(',').map((o) => o.trim()).filter(Boolean) }), 'New poll is live on the home page')
              setPollForm({ ...pollForm, question: '', question_ar: '' })
            }}
          >
            <h2>New pulse poll</h2>
            <p className="muted small">Starting a new poll closes the current one. Answers are private — only totals are shown.</p>
            <label>Question<input required value={pollForm.question} placeholder="e.g. Do you have the tools you need this week?" onChange={(e) => setPollForm({ ...pollForm, question: e.target.value })} /></label>
            <label>السؤال بالعربي<input dir="rtl" value={pollForm.question_ar} onChange={(e) => setPollForm({ ...pollForm, question_ar: e.target.value })} /></label>
            <label>Answers (comma separated — emoji or short words)<input value={pollForm.options} onChange={(e) => setPollForm({ ...pollForm, options: e.target.value })} /></label>
            <button type="submit"><Vote size={15} /> Start poll</button>
          </form>
          <section className="card">
            <h2>Polls</h2>
            <ul className="history">
              {polls.map((p) => (
                <li key={p.id}>
                  <span>{p.question}<small className="muted"> · {timeAgo(p.created_at)}</small></span>
                  {p.active ? <span className="status-pill tone-green">Live</span> : <button className="link small" onClick={async () => { await supabase.from('polls').update({ active: false }).eq('active', true); void run(supabase.from('polls').update({ active: true }).eq('id', p.id), 'Poll reopened') }}>Reopen</button>}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {tab === 'points' && (
        <form className="card narrow-card" onSubmit={(e) => { e.preventDefault(); void run(supabase.rpc('award_points', { target: award.user, pts: award.points, why: award.reason }), `Gave ${award.points} points`) }}>
          <h2>Award points</h2>
          <p className="muted small">For great work, helping customers, or an idea of the month. The person sees the reason in their history.</p>
          <label>
            Person
            <select required value={award.user} onChange={(e) => setAward({ ...award, user: e.target.value })}>
              <option value="">Choose…</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </label>
          <div className="two-fields">
            <label>Points<input type="number" value={award.points} onChange={(e) => setAward({ ...award, points: Number(e.target.value) })} /></label>
            <label>Reason<input required value={award.reason} onChange={(e) => setAward({ ...award, reason: e.target.value })} /></label>
          </div>
          <button type="submit">Give points</button>
        </form>
      )}
    </div>
  )
}
