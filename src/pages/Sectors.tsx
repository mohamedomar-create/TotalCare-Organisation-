import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Building2, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useDirectory } from '../lib/useDirectory'
import { useStaff, type Idea } from '../lib/community'
import { PageHero } from '../components/ui'

export const SECTOR_EMOJI: Record<string, string> = {
  Sales: '📈',
  Marketing: '📣',
  Finance: '💰',
  'Legal & HR': '⚖️',
  'Systems & Quality': '🛡️',
  Service: '🔧',
  Purchasing: '📦',
  Management: '🏛️',
}

export default function Sectors() {
  const { departments, people } = useDirectory()
  const staff = useStaff()
  const [ideas, setIdeas] = useState<Pick<Idea, 'department_id'>[]>([])

  useEffect(() => {
    supabase.from('ideas').select('department_id').eq('hidden', false).then(({ data }) => setIdeas((data ?? []) as Pick<Idea, 'department_id'>[]))
  }, [])

  const sectors = useMemo(
    () =>
      departments.map((d) => ({
        ...d,
        members: new Set([...staff.filter((s) => s.department_id === d.id).map((s) => s.full_name), ...people.filter((p) => p.department_id === d.id).map((p) => p.full_name)]).size,
        ideas: ideas.filter((i) => i.department_id === d.id).length,
      })),
    [departments, staff, people, ideas],
  )

  return (
    <div className="page wide">
      <PageHero kicker="Our sectors" title="One company, seven strong teams" ar="شركة واحدة… وفرق قوية" icon={<Building2 size={30} />}>
        <p className="hero-sub">Open a sector to meet its people, see its ideas and thank its team.</p>
      </PageHero>
      <div className="sector-grid">
        {sectors.map((s, i) => (
          <Link key={s.id} to={`/sectors/${s.id}`} className="sector-card rise" style={{ '--c': s.color, animationDelay: `${i * 60}ms` } as React.CSSProperties}>
            <span className="sector-emoji">{SECTOR_EMOJI[s.name] ?? '🏢'}</span>
            <h3>{s.name}</h3>
            <p>{s.description || ' '}</p>
            <div className="sector-stats">
              <span><Users size={14} /> {s.members}</span>
              <span>💡 {s.ideas}</span>
              <ArrowRight size={16} className="sector-go" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
