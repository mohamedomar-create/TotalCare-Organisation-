import { useMemo, useState } from 'react'
import { Lightbulb, Plus, Search } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { useDirectory } from '../lib/useDirectory'
import { useIdeas } from '../lib/useIdeas'
import { IDEA_STATUS, useStaff, type IdeaStatus } from '../lib/community'
import IdeaCard from '../components/community/IdeaCard'
import NewIdeaModal from '../components/community/NewIdeaModal'
import { CountUp, Empty, PageHero } from '../components/ui'

const TABS: { key: 'all' | IdeaStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'review', label: 'Under review' },
  { key: 'planned', label: 'Planned' },
  { key: 'done', label: 'Done 🎉' },
]

export default function Ideas() {
  const { session } = useAuth()
  const { departments } = useDirectory()
  const staffList = useStaff()
  const { ideas, myVotes, loading, reload, toggleVote } = useIdeas(session?.user.id)
  const [tab, setTab] = useState<'all' | IdeaStatus>('all')
  const [sort, setSort] = useState<'top' | 'new'>('top')
  const [dept, setDept] = useState('')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)

  const staff = useMemo(() => new Map(staffList.map((s) => [s.id, s])), [staffList])
  const depts = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments])
  const visible = ideas.filter((i) => !i.hidden)
  const done = visible.filter((i) => i.status === 'done').length

  const list = visible
    .filter((i) => tab === 'all' || i.status === tab)
    .filter((i) => !dept || i.department_id === dept)
    .filter((i) => !q.trim() || (i.title + ' ' + i.body).toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => (sort === 'top' ? b.votes - a.votes || b.created_at.localeCompare(a.created_at) : b.created_at.localeCompare(a.created_at)))

  return (
    <div className="page wide">
      <PageHero kicker="Idea board" title="Every idea makes TotalCare better" ar="كل فكرة بتخلي TotalCare أحسن" icon={<Lightbulb size={30} />}>
        <div className="hero-stats">
          <span><b><CountUp value={visible.length} /></b> ideas</span>
          <span><b><CountUp value={visible.reduce((s, i) => s + i.votes, 0)} /></b> likes</span>
          <span><b><CountUp value={done} /></b> put into action</span>
        </div>
        <button type="button" className="hero-cta" onClick={() => setOpen(true)}><Plus size={18} /> Share an idea</button>
      </PageHero>

      <div className="toolbar">
        <div className="segmented">
          {TABS.map((t) => (
            <button key={t.key} type="button" className={tab === t.key ? 'active' : ''} onClick={() => setTab(t.key)}>
              {t.label}{t.key !== 'all' && <span className="seg-count">{visible.filter((i) => i.status === t.key).length}</span>}
            </button>
          ))}
        </div>
        <div className="search"><Search size={16} /><input placeholder="Search ideas…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Sector">
          <option value="">All sectors</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <div className="segmented">
          <button type="button" className={sort === 'top' ? 'active' : ''} onClick={() => setSort('top')}>Top</button>
          <button type="button" className={sort === 'new' ? 'active' : ''} onClick={() => setSort('new')}>Newest</button>
        </div>
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : list.length === 0 ? (
        <Empty emoji="💡" title={visible.length ? 'No ideas match' : 'Be the first to share an idea'}>
          {visible.length ? 'Try another filter.' : 'Good ideas earn points — and the best ones become real.'}
        </Empty>
      ) : (
        <div className="idea-list">
          {list.map((i, n) => (
            <IdeaCard key={i.id} idea={i} index={n} voted={myVotes.has(i.id)} onVote={() => toggleVote(i)} staff={staff} depts={depts} />
          ))}
        </div>
      )}

      <button type="button" className="fab" onClick={() => setOpen(true)} aria-label="Share an idea"><Plus size={24} /></button>
      {open && <NewIdeaModal departments={departments} onClose={() => setOpen(false)} onPosted={reload} />}
      <p className="muted small center-text">Status meanings: {Object.values(IDEA_STATUS).map((s) => s.label).join(' → ')}</p>
    </div>
  )
}
