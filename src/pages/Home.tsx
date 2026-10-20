import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, ClipboardList, Heart, Lightbulb, Megaphone, Pin, ShieldCheck, Trophy } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useDirectory } from '../lib/useDirectory'
import { useIdeas } from '../lib/useIdeas'
import { createSubmission, useAllowance, useMySubmissions } from '../lib/submissions'
import { WIZARD_STEPS } from '../lib/survey'
import { levelFor, timeAgo, useMyPoints, useStaff, type Announcement, type Kudos } from '../lib/community'
import FeedbackButton from '../components/FeedbackButton'
import IdeaCard from '../components/community/IdeaCard'
import NewIdeaModal from '../components/community/NewIdeaModal'
import GiveKudosModal, { KudosCard } from '../components/community/GiveKudos'
import PollWidget from '../components/community/PollWidget'
import { Avatar, CountUp } from '../components/ui'
import { SECTOR_EMOJI } from './Sectors'

interface Celebration {
  user_id: string
  full_name: string
  department_id: string | null
  kind: 'birthday' | 'anniversary' | 'welcome'
  day: number
  years: number | null
}

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export default function Home() {
  const { session, profile } = useAuth()
  const navigate = useNavigate()
  const { departments } = useDirectory()
  const staffList = useStaff()
  const { items } = useMySubmissions(session?.user.id)
  const { canStart } = useAllowance(session?.user.id)
  const { balance, earned } = useMyPoints(session?.user.id)
  const { ideas, myVotes, reload, toggleVote } = useIdeas(session?.user.id)
  const [news, setNews] = useState<Announcement[]>([])
  const [kudos, setKudos] = useState<Kudos[]>([])
  const [party, setParty] = useState<Celebration[]>([])
  const [ideaOpen, setIdeaOpen] = useState(false)
  const [kudosOpen, setKudosOpen] = useState(false)

  const staff = useMemo(() => new Map(staffList.map((s) => [s.id, s])), [staffList])
  const depts = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments])

  const loadKudos = async () => {
    const { data } = await supabase.from('kudos').select('*').order('created_at', { ascending: false }).limit(6)
    setKudos((data ?? []) as Kudos[])
  }

  useEffect(() => {
    supabase.from('announcements').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(4).then(({ data }) => setNews((data ?? []) as Announcement[]))
    supabase.rpc('celebrations').then(({ data }) => setParty((data ?? []) as Celebration[]))
    void loadKudos()
  }, [])

  const draft = items.find((s) => s.status === 'draft')
  const sent = items.some((s) => s.status === 'submitted')
  const firstName = (profile?.full_name || '').split(' ')[0]
  const level = levelFor(earned)
  const topIdeas = ideas.filter((i) => !i.hidden && i.status !== 'declined').sort((a, b) => b.votes - a.votes).slice(0, 3)
  const doneIdeas = ideas.filter((i) => i.status === 'done' && !i.hidden).length

  async function startSurvey() {
    if (draft) return navigate(`/vision/${draft.id}`)
    if (!canStart) return navigate('/vision')
    navigate(`/vision/${await createSubmission()}`)
  }

  return (
    <div className="page wide home">
      <section className="home-hero">
        <div className="hero-orbs" aria-hidden="true"><span /><span /><span /></div>
        <div className="home-hero-inner">
          <div className="grow">
            <p className="hero-kicker">TotalCare Egypt · Our place</p>
            <h1>{greeting()}{firstName ? `, ${firstName}` : ''} 👋</h1>
            <p className="hero-ar" lang="ar">أهلاً بيك في مكاننا… هنا صوتك مسموع وأفكارك ليها قيمة</p>
            <p className="hero-sub">Share ideas, thank colleagues and help shape how we work — every action earns points you can turn into real rewards.</p>
            <div className="hero-stats">
              <span><b><CountUp value={ideas.filter((i) => !i.hidden).length} /></b> ideas shared</span>
              <span><b><CountUp value={doneIdeas} /></b> made real</span>
              <span><b><CountUp value={staffList.length} /></b> colleagues here</span>
            </div>
          </div>
          <Link to="/rewards" className="me-card plain">
            <span className="level-emoji">{level.emoji}</span>
            <strong><CountUp value={balance} /> pts</strong>
            <small>{level.name}</small>
            <div className="level-bar"><span style={{ width: `${level.progress * 100}%` }} /></div>
            <small>{level.next ? `${level.next.min - earned} to ${level.next.name}` : 'Top level!'}</small>
          </Link>
        </div>
      </section>

      <section className="action-grid">
        <button type="button" className="action-card a-idea rise" onClick={() => setIdeaOpen(true)}>
          <Lightbulb size={26} /><strong>Share an idea</strong><small lang="ar">شارك فكرة</small><span className="action-pts">+10</span>
        </button>
        <button type="button" className="action-card a-kudos rise" onClick={() => setKudosOpen(true)}>
          <Heart size={26} /><strong>Thank a colleague</strong><small lang="ar">اشكر زميل</small><span className="action-pts">+5</span>
        </button>
        <button type="button" className="action-card a-survey rise" onClick={startSurvey}>
          <ClipboardList size={26} />
          <strong>{draft ? `Continue survey (step ${(draft.current_step ?? 0) + 1}/${WIZARD_STEPS.length})` : sent && !canStart ? 'Your view is sent ✓' : sent ? 'Share your view again' : 'Shape TotalCare'}</strong>
          <small lang="ar">{draft ? 'كمّل الاستبيان' : sent && !canStart ? 'شكراً — رأيك وصل' : 'شارك رأيك في التنظيم'}</small>
          {!sent && <span className="action-pts">+50</span>}
        </button>
        <div className="action-card a-speak rise">
          <ShieldCheck size={26} /><strong>Speak up safely</strong><small lang="ar">قول رأيك بأمان</small>
          <span className="muted-on-dark small">Only the admin reads it.</span>
          <FeedbackButton compact />
        </div>
      </section>

      <div className="home-grid">
        <div className="home-main">
          {news.length > 0 && (
            <section className="card news">
              <div className="row between"><h2><Megaphone size={18} /> News</h2></div>
              {news.map((n) => (
                <article key={n.id} className={`news-item ${n.pinned ? 'pinned' : ''}`}>
                  {n.pinned && <Pin size={14} className="pin" />}
                  <strong dir="auto">{n.title}</strong>
                  {n.body && <p className="pre muted" dir="auto">{n.body}</p>}
                  <small className="muted">{timeAgo(n.created_at)}</small>
                </article>
              ))}
            </section>
          )}

          <section>
            <div className="row between">
              <h2>🔥 Top ideas</h2>
              <Link to="/ideas" className="link">All ideas <ArrowRight size={14} /></Link>
            </div>
            {topIdeas.length === 0 ? (
              <button type="button" className="card empty-cta" onClick={() => setIdeaOpen(true)}>💡 No ideas yet — be the first and earn 10 points</button>
            ) : (
              <div className="idea-list">{topIdeas.map((i, n) => <IdeaCard key={i.id} idea={i} index={n} voted={myVotes.has(i.id)} onVote={() => toggleVote(i)} staff={staff} depts={depts} />)}</div>
            )}
          </section>

          <section>
            <div className="row between">
              <h2>💌 Latest thank-yous</h2>
              <Link to="/kudos" className="link">Kudos wall <ArrowRight size={14} /></Link>
            </div>
            {kudos.length === 0 ? (
              <button type="button" className="card empty-cta" onClick={() => setKudosOpen(true)}>💌 Nobody has been thanked yet — make someone’s day</button>
            ) : (
              <div className="kudos-grid">{kudos.slice(0, 4).map((k, i) => <KudosCard key={k.id} k={k} index={i} staff={staff} depts={depts} />)}</div>
            )}
          </section>
        </div>

        <aside className="home-side">
          {session && <PollWidget userId={session.user.id} />}

          <section className="card">
            <h3>🎉 Celebrations this month</h3>
            {party.length === 0 ? (
              <p className="muted small">Add your birthday and joining date in <Link to="/me">My profile</Link> so we can celebrate you.</p>
            ) : (
              <ul className="party">
                {party.map((c) => (
                  <li key={c.user_id + c.kind}>
                    <span className="party-emoji">{c.kind === 'birthday' ? '🎂' : c.kind === 'welcome' ? '👋' : '🏅'}</span>
                    <span className="grow">
                      <strong>{c.full_name}</strong>
                      <small className="muted">
                        {c.kind === 'birthday' ? `Birthday on the ${c.day}` : c.kind === 'welcome' ? 'Welcome to the team!' : `${c.years} year${c.years === 1 ? '' : 's'} at TotalCare`}
                      </small>
                    </span>
                    {c.user_id !== session?.user.id && <button type="button" className="link small" onClick={() => setKudosOpen(true)}>Say hi</button>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card">
            <div className="row between"><h3>🏢 Our sectors</h3><Link to="/sectors" className="link small">All</Link></div>
            <div className="sector-mini">
              {departments.filter((d) => d.name !== 'Management').map((d) => (
                <Link key={d.id} to={`/sectors/${d.id}`} className="sector-pill plain" style={{ '--c': d.color } as React.CSSProperties}>
                  {SECTOR_EMOJI[d.name] ?? '🏢'} {d.name}
                </Link>
              ))}
            </div>
          </section>

          <Link to="/rewards" className="card rewards-teaser plain">
            <Trophy size={22} />
            <span><strong>Rewards shop</strong><small className="muted">Coffee, lunch with the MD, vouchers, a day off…</small></span>
            <ArrowRight size={16} />
          </Link>

          <section className="card who-here">
            <h3>👥 New faces</h3>
            <div className="faces">
              {staffList.slice(-8).reverse().map((s) => (
                <span key={s.id} title={s.full_name}><Avatar name={s.full_name} size={34} color={s.department_id ? depts.get(s.department_id)?.color : undefined} /></span>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {ideaOpen && <NewIdeaModal departments={departments} onClose={() => setIdeaOpen(false)} onPosted={reload} />}
      {kudosOpen && session && <GiveKudosModal staff={staffList} me={session.user.id} depts={depts} onClose={() => setKudosOpen(false)} onSent={loadKudos} />}
    </div>
  )
}
