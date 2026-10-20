import { useCallback, useEffect, useMemo, useState } from 'react'
import { Heart } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useDirectory } from '../lib/useDirectory'
import { KUDOS_VALUES, useStaff, type Kudos } from '../lib/community'
import GiveKudosModal, { KudosCard } from '../components/community/GiveKudos'
import { Avatar, CountUp, Empty, PageHero } from '../components/ui'

export default function KudosWall() {
  const { session, profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const { departments } = useDirectory()
  const staffList = useStaff()
  const [kudos, setKudos] = useState<Kudos[]>([])
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')

  const staff = useMemo(() => new Map(staffList.map((s) => [s.id, s])), [staffList])
  const depts = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments])

  const load = useCallback(async () => {
    const { data } = await supabase.from('kudos').select('*').order('created_at', { ascending: false }).limit(200)
    setKudos((data ?? []) as Kudos[])
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const thisMonth = kudos.filter((k) => k.created_at >= monthStart)
  const counts = new Map<string, number>()
  for (const k of thisMonth) counts.set(k.to_id, (counts.get(k.to_id) ?? 0) + 1)
  const stars = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 3)

  return (
    <div className="page wide">
      <PageHero kicker="Kudos wall" title="Say thank you. Make someone’s day." ar="قول شكراً… وفرّح زميلك" color="#db2777" icon={<Heart size={30} />}>
        <div className="hero-stats">
          <span><b><CountUp value={kudos.length} /></b> thank-yous</span>
          <span><b><CountUp value={thisMonth.length} /></b> this month</span>
        </div>
        <button type="button" className="hero-cta" onClick={() => setOpen(true)}><Heart size={18} /> Thank a colleague</button>
      </PageHero>

      {stars.length > 0 && (
        <section className="card stars">
          <h2>⭐ Most thanked this month</h2>
          <div className="podium">
            {stars.map(([id, n], i) => {
              const s = staff.get(id)
              return (
                <div key={id} className={`podium-spot p${i + 1} rise`}>
                  <span className="medal">{['🥇', '🥈', '🥉'][i]}</span>
                  <Avatar name={s?.full_name ?? '?'} size={52} color={s?.department_id ? depts.get(s.department_id)?.color : undefined} />
                  <strong>{s?.full_name ?? 'Colleague'}</strong>
                  <span className="muted small">{n} kudos</span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <div className="chips filter-chips">
        <button type="button" className={`chip ${!value ? 'on' : ''}`} onClick={() => setValue('')}>All</button>
        {KUDOS_VALUES.map((v) => (
          <button key={v.value} type="button" className={`chip ${value === v.value ? 'on' : ''}`} onClick={() => setValue(v.value)}>{v.emoji} {v.label}</button>
        ))}
      </div>

      {kudos.length === 0 ? (
        <Empty emoji="💌" title="No kudos yet">Be the first to thank a colleague — it takes 20 seconds.</Empty>
      ) : (
        <div className="kudos-grid">
          {kudos.filter((k) => !value || k.value === value).map((k, i) => (
            <KudosCard
              key={k.id}
              k={k}
              index={i}
              staff={staff}
              depts={depts}
              canDelete={isAdmin || k.from_id === session?.user.id}
              onDelete={async () => { if (confirm('Remove this kudos?')) { await supabase.from('kudos').delete().eq('id', k.id); void load() } }}
            />
          ))}
        </div>
      )}

      <button type="button" className="fab pink" onClick={() => setOpen(true)} aria-label="Thank a colleague"><Heart size={24} /></button>
      {open && session && <GiveKudosModal staff={staffList} me={session.user.id} depts={depts} onClose={() => setOpen(false)} onSent={load} />}
    </div>
  )
}
