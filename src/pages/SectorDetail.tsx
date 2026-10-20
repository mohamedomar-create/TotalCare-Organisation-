import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Heart, Lightbulb, Mail, Phone } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useDirectory } from '../lib/useDirectory'
import { useIdeas } from '../lib/useIdeas'
import { useStaff, type Kudos } from '../lib/community'
import IdeaCard from '../components/community/IdeaCard'
import NewIdeaModal from '../components/community/NewIdeaModal'
import GiveKudosModal, { KudosCard } from '../components/community/GiveKudos'
import { Avatar, CountUp, Empty, PageHero } from '../components/ui'
import { SECTOR_EMOJI } from './Sectors'

export default function SectorDetail() {
  const { id } = useParams()
  const { session } = useAuth()
  const { departments, people } = useDirectory()
  const staffList = useStaff()
  const { ideas, myVotes, reload, toggleVote } = useIdeas(session?.user.id, id)
  const [kudos, setKudos] = useState<Kudos[]>([])
  const [ideaOpen, setIdeaOpen] = useState(false)
  const [kudosOpen, setKudosOpen] = useState(false)

  const dept = departments.find((d) => d.id === id)
  const staff = useMemo(() => new Map(staffList.map((s) => [s.id, s])), [staffList])
  const depts = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments])
  const members = staffList.filter((s) => s.department_id === id)
  const directory = people.filter((p) => p.department_id === id)
  const memberIds = useMemo(() => new Set(members.map((m) => m.id)), [members])

  const loadKudos = async () => {
    const { data } = await supabase.from('kudos').select('*').order('created_at', { ascending: false }).limit(200)
    setKudos(((data ?? []) as Kudos[]))
  }
  useEffect(() => {
    void loadKudos()
  }, [])

  const teamKudos = kudos.filter((k) => memberIds.has(k.to_id))
  const visibleIdeas = ideas.filter((i) => !i.hidden)

  if (!dept) return <div className="page"><p className="muted">Loading…</p></div>

  return (
    <div className="page wide">
      <Link to="/sectors" className="link"><ArrowLeft size={15} /> All sectors</Link>
      <PageHero kicker="Sector" title={`${SECTOR_EMOJI[dept.name] ?? '🏢'} ${dept.name}`} color={dept.color}>
        {dept.description && <p className="hero-sub">{dept.description}</p>}
        <div className="hero-stats">
          <span><b><CountUp value={Math.max(members.length, directory.length)} /></b> people</span>
          <span><b><CountUp value={visibleIdeas.length} /></b> ideas</span>
          <span><b><CountUp value={teamKudos.length} /></b> thank-yous received</span>
        </div>
        <div className="row">
          <button type="button" className="hero-cta" onClick={() => setIdeaOpen(true)}><Lightbulb size={18} /> Idea for {dept.name}</button>
          <button type="button" className="hero-cta ghost" onClick={() => setKudosOpen(true)}><Heart size={18} /> Thank the team</button>
        </div>
      </PageHero>

      <div className="sector-layout">
        <div>
          <h2>Ideas for {dept.name}</h2>
          {visibleIdeas.length === 0 ? (
            <Empty emoji="💡" title={`No ideas for ${dept.name} yet`}>Share the first one.</Empty>
          ) : (
            <div className="idea-list">
              {visibleIdeas.map((i, n) => <IdeaCard key={i.id} idea={i} index={n} voted={myVotes.has(i.id)} onVote={() => toggleVote(i)} staff={staff} depts={depts} />)}
            </div>
          )}
          <h2>Thank-yous for the team</h2>
          {teamKudos.length === 0 ? (
            <Empty emoji="💌" title="No kudos yet">Be the first to thank someone in {dept.name}.</Empty>
          ) : (
            <div className="kudos-grid">{teamKudos.slice(0, 12).map((k, i) => <KudosCard key={k.id} k={k} index={i} staff={staff} depts={depts} />)}</div>
          )}
        </div>
        <aside className="card team-card" style={{ '--c': dept.color } as React.CSSProperties}>
          <h2>The team</h2>
          {members.length === 0 && directory.length === 0 && <p className="muted small">Team members appear here once they set their sector in “My profile”.</p>}
          <ul className="team-list">
            {members.map((m) => (
              <li key={m.id}>
                <Avatar name={m.full_name} size={34} color={dept.color} />
                <span><strong>{m.full_name}</strong><small className="muted">{m.job_title || 'Team member'}</small></span>
              </li>
            ))}
            {directory.filter((p) => !members.some((m) => m.full_name === p.full_name)).map((p) => (
              <li key={p.id}>
                <Avatar name={p.full_name} size={34} color={dept.color} />
                <span>
                  <strong>{p.full_name}</strong>
                  <small className="muted">{p.title}</small>
                  <span className="contact">
                    {p.email && <a href={`mailto:${p.email}`} aria-label="E-mail"><Mail size={13} /></a>}
                    {p.phone && <a href={`tel:${p.phone}`} aria-label="Phone"><Phone size={13} /></a>}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {ideaOpen && <NewIdeaModal departments={departments} defaultDept={id} onClose={() => setIdeaOpen(false)} onPosted={reload} />}
      {kudosOpen && session && (
        <GiveKudosModal staff={members.length ? members : staffList} me={session.user.id} depts={depts} onClose={() => setKudosOpen(false)} onSent={loadKudos} />
      )}
    </div>
  )
}
