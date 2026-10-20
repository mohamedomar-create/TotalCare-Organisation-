import { useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import {
  BarChart3,
  BookUser,
  FileText,
  Gift,
  Heart,
  Home as HomeIcon,
  LayoutGrid,
  Lightbulb,
  Sparkles,
  UserRound,
  Inbox,
  LogOut,
  Mail,
  Menu,
  Network,
  PencilRuler,
  Settings2,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from './lib/auth'
import { isConfigured, supabase } from './lib/supabase'
import { useAdminCounts } from './lib/useAdminCounts'
import type { Role } from './lib/types'
import { initials } from './lib/initials'
import FeedbackButton from './components/FeedbackButton'
import Login from './pages/Login'
import Home from './pages/Home'
import OrgChart from './pages/OrgChart'
import Directory from './pages/Directory'
import MyVision from './pages/MyVision'
import VisionWizard from './pages/VisionWizard'
import AdminDashboard from './pages/AdminDashboard'
import AdminInbox from './pages/AdminInbox'
import AdminSubmissionDetail from './pages/AdminSubmissionDetail'
import AdminDirectory from './pages/AdminDirectory'
import AdminUsers from './pages/AdminUsers'
import AdminEmail from './pages/AdminEmail'
import Reports from './pages/Reports'
import ReportView from './pages/ReportView'
import Ideas from './pages/Ideas'
import IdeaDetail from './pages/IdeaDetail'
import KudosWall from './pages/KudosWall'
import Sectors from './pages/Sectors'
import SectorDetail from './pages/SectorDetail'
import Rewards from './pages/Rewards'
import Profile from './pages/Profile'
import AdminCommunity from './pages/AdminCommunity'
import { levelFor, useMyPoints } from './lib/community'

function RequireRole({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const { profile } = useAuth()
  if (!profile || !roles.includes(profile.role)) return <Navigate to="/" replace />
  return <>{children}</>
}

function Badge({ n }: { n: number }) {
  return n > 0 ? <span className="badge">{n > 99 ? '99+' : n}</span> : null
}

export default function App() {
  const { session, profile, loading } = useAuth()
  const role = profile?.role ?? 'staff'
  const isAdmin = role === 'admin'
  const counts = useAdminCounts(Boolean(session) && isAdmin)
  const { balance, earned } = useMyPoints(session?.user.id)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => setMenuOpen(false), [location.pathname])

  if (!isConfigured) {
    return (
      <div className="centered">
        <div className="card narrow">
          <h1>Setup needed</h1>
          <p>Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>. See the README.</p>
        </div>
      </div>
    )
  }
  if (loading) return <div className="centered muted">Loading…</div>
  if (!session) return <Login />

  const name = profile?.full_name || session.user.email || ''
  // The submission wizard runs full-screen, like a Typeform, to keep people focused.
  const focus = /^\/vision\/[^/]+$/.test(location.pathname)

  return (
    <div className={`app ${focus ? 'focus' : ''}`}>
      <header className="mobile-bar">
        <button type="button" className="icon-btn" onClick={() => setMenuOpen((v) => !v)} aria-label="Menu">
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <span className="brand">TotalCare <span>Organisation</span></span>
        {isAdmin && <Badge n={counts.submissions + counts.feedback} />}
      </header>

      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="brand-block">
          <div className="logo">TC</div>
          <div>
            <div className="brand">TotalCare</div>
            <div className="muted small">Organisation</div>
          </div>
        </div>

        <nav>
          <NavLink to="/" end><HomeIcon size={18} /> Home</NavLink>

          <p className="nav-section">Community</p>
          <NavLink to="/ideas"><Lightbulb size={18} /> Ideas</NavLink>
          <NavLink to="/kudos"><Heart size={18} /> Kudos wall</NavLink>
          <NavLink to="/sectors"><LayoutGrid size={18} /> Sectors</NavLink>
          <NavLink to="/rewards"><Gift size={18} /> Rewards <span className="nav-pts">{balance}</span></NavLink>

          <p className="nav-section">Our company</p>
          <NavLink to="/org"><Network size={18} /> Org chart</NavLink>
          <NavLink to="/directory"><BookUser size={18} /> Directory</NavLink>

          <p className="nav-section">My space</p>
          <NavLink to="/vision"><PencilRuler size={18} /> Shape TotalCare</NavLink>
          <NavLink to="/me"><UserRound size={18} /> My profile</NavLink>
          {(role === 'management' || isAdmin) && <NavLink to="/reports"><FileText size={18} /> Reports</NavLink>}
          {role === 'management' && <NavLink to="/admin/community"><Sparkles size={18} /> Announcements</NavLink>}

          {isAdmin && (
            <>
              <p className="nav-section">Admin</p>
              <NavLink to="/admin" end><BarChart3 size={18} /> Dashboard</NavLink>
              <NavLink to="/admin/inbox"><Inbox size={18} /> Inbox <Badge n={counts.submissions + counts.feedback} /></NavLink>
              <NavLink to="/admin/community"><Sparkles size={18} /> Community</NavLink>
              <NavLink to="/admin/directory"><Settings2 size={18} /> Edit directory</NavLink>
              <NavLink to="/admin/users"><Users size={18} /> Users & roles</NavLink>
              <NavLink to="/admin/email"><Mail size={18} /> E-mail</NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-foot">
          <FeedbackButton compact />
          <div className="me">
            <div className="avatar small">{initials(name)}</div>
            <div className="me-text">
              <div className="me-name">{name}</div>
              <div className="muted small">{levelFor(earned).emoji} {levelFor(earned).name} · {role}</div>
            </div>
            <button type="button" className="icon-btn" title="Sign out" onClick={() => supabase.auth.signOut()}><LogOut size={17} /></button>
          </div>
        </div>
      </aside>
      {menuOpen && <div className="sidebar-scrim" onClick={() => setMenuOpen(false)} />}

      <main className="content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/org" element={<OrgChart />} />
          <Route path="/directory" element={<Directory />} />
          <Route path="/vision" element={<MyVision />} />
          <Route path="/vision/:id" element={<VisionWizard />} />
          <Route path="/ideas" element={<Ideas />} />
          <Route path="/ideas/:id" element={<IdeaDetail />} />
          <Route path="/kudos" element={<KudosWall />} />
          <Route path="/sectors" element={<Sectors />} />
          <Route path="/sectors/:id" element={<SectorDetail />} />
          <Route path="/rewards" element={<Rewards />} />
          <Route path="/me" element={<Profile />} />
          <Route path="/admin/community" element={<RequireRole roles={['management', 'admin']}><AdminCommunity /></RequireRole>} />
          <Route path="/reports" element={<RequireRole roles={['management', 'admin']}><Reports /></RequireRole>} />
          <Route path="/reports/:id" element={<RequireRole roles={['management', 'admin']}><ReportView /></RequireRole>} />
          <Route path="/admin" element={<RequireRole roles={['admin']}><AdminDashboard /></RequireRole>} />
          <Route path="/admin/inbox" element={<RequireRole roles={['admin']}><AdminInbox /></RequireRole>} />
          <Route path="/admin/submissions/:id" element={<RequireRole roles={['admin']}><AdminSubmissionDetail /></RequireRole>} />
          <Route path="/admin/directory" element={<RequireRole roles={['admin']}><AdminDirectory /></RequireRole>} />
          <Route path="/admin/users" element={<RequireRole roles={['admin']}><AdminUsers /></RequireRole>} />
          <Route path="/admin/email" element={<RequireRole roles={['admin']}><AdminEmail /></RequireRole>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
