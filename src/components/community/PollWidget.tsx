import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Poll } from '../../lib/community'
import { celebrate } from '../ui'

export default function PollWidget({ userId }: { userId: string }) {
  const [poll, setPoll] = useState<Poll | null>(null)
  const [mine, setMine] = useState<number | null>(null)
  const [results, setResults] = useState<Record<number, number>>({})

  const load = useCallback(async () => {
    const { data } = await supabase.from('polls').select('*').eq('active', true).order('created_at', { ascending: false }).limit(1).maybeSingle()
    const p = data as Poll | null
    setPoll(p)
    if (!p) return
    const [v, r] = await Promise.all([
      supabase.from('poll_votes').select('choice').eq('poll_id', p.id).eq('user_id', userId).maybeSingle(),
      supabase.rpc('poll_results', { p_poll: p.id }),
    ])
    setMine((v.data as { choice: number } | null)?.choice ?? null)
    setResults(Object.fromEntries(((r.data ?? []) as { choice: number; votes: number }[]).map((x) => [x.choice, Number(x.votes)])))
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  async function answer(choice: number) {
    if (!poll || mine !== null) return
    setMine(choice)
    setResults((r) => ({ ...r, [choice]: (r[choice] ?? 0) + 1 }))
    const { error } = await supabase.from('poll_votes').insert({ poll_id: poll.id, choice })
    if (error) void load()
    else celebrate()
  }

  if (!poll) return null
  const total = Object.values(results).reduce((a, b) => a + b, 0)

  return (
    <section className="card poll-card">
      <p className="hero-kicker dark">Pulse poll · anonymous</p>
      <h3>{poll.question}</h3>
      {poll.question_ar && <p className="muted" lang="ar" dir="rtl">{poll.question_ar}</p>}
      <div className="poll-options">
        {poll.options.map((o, i) => {
          const pct = total ? Math.round(((results[i] ?? 0) / total) * 100) : 0
          return (
            <button key={i} type="button" className={`poll-opt ${mine === i ? 'on' : ''} ${mine !== null ? 'answered' : ''}`} onClick={() => answer(i)} disabled={mine !== null}>
              <span className="poll-emoji">{o}</span>
              {mine !== null && <span className="poll-pct">{pct}%</span>}
              {mine !== null && <span className="poll-fill" style={{ height: `${pct}%` }} />}
            </button>
          )
        })}
      </div>
      <p className="muted small">{mine === null ? 'Tap one — only totals are ever shown. +2 points' : `Thanks! ${total} answer${total === 1 ? '' : 's'} so far.`}</p>
    </section>
  )
}
