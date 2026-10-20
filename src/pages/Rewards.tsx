import { useCallback, useEffect, useMemo, useState } from 'react'
import { Gift, Trophy } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useDirectory } from '../lib/useDirectory'
import { BADGES, LEVELS, POINT_RULES, levelFor, timeAgo, useMyPoints, type Redemption, type Reward } from '../lib/community'
import { Avatar, CountUp, PageHero, celebrate } from '../components/ui'

interface LeaderRow {
  user_id: string
  full_name: string
  department_id: string | null
  points: number
}

export default function Rewards() {
  const { session } = useAuth()
  const { departments } = useDirectory()
  const { ledger, balance, earned, reasons, reload } = useMyPoints(session?.user.id)
  const [rewards, setRewards] = useState<Reward[]>([])
  const [mine, setMine] = useState<Redemption[]>([])
  const [leaders, setLeaders] = useState<LeaderRow[]>([])
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const depts = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments])
  const level = levelFor(earned)

  const load = useCallback(async () => {
    const [r, m, l] = await Promise.all([
      supabase.from('rewards').select('*').eq('active', true).order('cost'),
      supabase.from('redemptions').select('*').eq('user_id', session!.user.id).order('created_at', { ascending: false }),
      supabase.rpc('leaderboard', { max_rows: 10 }),
    ])
    setRewards((r.data ?? []) as Reward[])
    setMine((m.data ?? []) as Redemption[])
    setLeaders((l.data ?? []) as LeaderRow[])
  }, [session])
  useEffect(() => {
    void load()
  }, [load])

  async function redeem(reward: Reward) {
    if (!confirm(`Use ${reward.cost} points for “${reward.title}”? The admin will confirm it with you.`)) return
    const { error } = await supabase.rpc('redeem', { p_reward: reward.id })
    if (error) return setMessage({ ok: false, text: error.message })
    celebrate()
    setMessage({ ok: true, text: `Request sent for “${reward.title}”. The admin will contact you.` })
    void reload()
    void load()
  }

  return (
    <div className="page wide">
      <PageHero kicker="Rewards" title="Your contribution counts" ar="مشاركتك ليها قيمة" color="#d97706" icon={<Trophy size={30} />}>
        <div className="points-hero">
          <div className="points-big"><CountUp value={balance} /><small>points to spend</small></div>
          <div className="level-box">
            <span className="level-emoji">{level.emoji}</span>
            <div className="grow">
              <strong>{level.name} <span lang="ar" className="muted-on-dark">· {level.ar}</span></strong>
              <div className="level-bar"><span style={{ width: `${level.progress * 100}%` }} /></div>
              <small>{level.next ? `${level.next.min - earned} points to ${level.next.emoji} ${level.next.name}` : 'Top level reached!'}</small>
            </div>
          </div>
        </div>
      </PageHero>

      {message && <p className={message.ok ? 'success-text' : 'error'}>{message.text}</p>}

      <section>
        <h2><Gift size={18} /> Rewards shop</h2>
        <div className="reward-grid">
          {rewards.map((r, i) => {
            const can = balance >= r.cost
            return (
              <div key={r.id} className={`reward-card rise ${can ? 'can' : ''}`} style={{ animationDelay: `${i * 60}ms` }}>
                <span className="reward-emoji">{r.emoji}</span>
                <strong>{r.title}</strong>
                {r.title_ar && <small lang="ar" className="muted">{r.title_ar}</small>}
                <p className="muted small">{r.description}</p>
                <div className="reward-cost">{r.cost.toLocaleString()} pts</div>
                <button type="button" disabled={!can} onClick={() => redeem(r)}>{can ? 'Get it' : `${r.cost - balance} more to go`}</button>
              </div>
            )
          })}
          {rewards.length === 0 && <p className="muted">The admin hasn’t added rewards yet.</p>}
        </div>
      </section>

      <div className="dash-grid">
        <section className="card">
          <h2>🏅 Your badges</h2>
          <div className="badge-grid">
            {BADGES.map((b) => {
              const got = b.test(reasons)
              return (
                <div key={b.key} className={`badge-tile ${got ? 'got' : ''}`} title={got ? 'Earned!' : 'Not yet'}>
                  <span>{b.emoji}</span>
                  <strong>{b.label}</strong>
                  <small lang="ar">{b.ar}</small>
                </div>
              )
            })}
          </div>
          <h3 className="mt">How to earn points</h3>
          <ul className="rules">
            {POINT_RULES.map((r) => <li key={r.label}><span>{r.emoji} {r.label}</span><b>+{r.points}</b></li>)}
          </ul>
          <p className="muted small">Levels: {LEVELS.map((l) => `${l.emoji} ${l.name} (${l.min})`).join(' · ')}</p>
        </section>

        <section className="card">
          <h2>🏆 Top contributors</h2>
          <ol className="leaderboard">
            {leaders.map((l, i) => {
              const d = l.department_id ? depts.get(l.department_id) : undefined
              return (
                <li key={l.user_id} className={l.user_id === session?.user.id ? 'me' : ''}>
                  <span className="rank">{['🥇', '🥈', '🥉'][i] ?? i + 1}</span>
                  <Avatar name={l.full_name} size={30} color={d?.color} />
                  <span className="grow"><strong>{l.full_name}</strong>{d && <small className="muted"> · {d.name}</small>}</span>
                  <b>{Number(l.points).toLocaleString()}</b>
                </li>
              )
            })}
          </ol>
          {leaders.length === 0 && <p className="muted small">No points yet.</p>}
        </section>
      </div>

      <div className="dash-grid">
        <section className="card">
          <h2>Your points history</h2>
          <ul className="history">
            {ledger.slice(0, 30).map((r) => (
              <li key={r.id}><span>{r.reason}<small className="muted"> · {timeAgo(r.created_at)}</small></span><b className={r.points < 0 ? 'neg' : 'pos'}>{r.points > 0 ? '+' : ''}{r.points}</b></li>
            ))}
          </ul>
          {ledger.length === 0 && <p className="muted small">Share an idea or thank a colleague to earn your first points.</p>}
        </section>
        <section className="card">
          <h2>Your reward requests</h2>
          <ul className="history">
            {mine.map((m) => (
              <li key={m.id}>
                <span>{rewards.find((r) => r.id === m.reward_id)?.title ?? 'Reward'}<small className="muted"> · {timeAgo(m.created_at)}</small></span>
                <span className={`status-pill tone-${m.status === 'approved' ? 'green' : m.status === 'rejected' ? 'rose' : 'amber'}`}>{m.status === 'pending' ? 'Waiting' : m.status === 'approved' ? 'Approved' : 'Returned'}</span>
              </li>
            ))}
          </ul>
          {mine.length === 0 && <p className="muted small">No requests yet.</p>}
        </section>
      </div>
    </div>
  )
}
