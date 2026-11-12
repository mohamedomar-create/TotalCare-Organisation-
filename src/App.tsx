import { useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import {
  Send,
  ClipboardList,
  Megaphone,
  Rocket,
  ShieldCheck,
  BarChart3,
  BookUser,
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
import AdminInbox from './pages/AdminInbox'
import AdminSubmissionDetail from './pages/AdminSubmissionDetail'
import AdminDirectory from './pages/AdminDirectory'
import AdminUsers from './pages/AdminUsers'
import AdminEmail from './pages/AdminEmail'
import Ideas from './pages/Ideas'
import IdeaDetail from './pages/IdeaDetail'
import KudosWall from './pages/KudosWall'
import Sectors from './pages/Sectors'
import SectorDetail from './pages/SectorDetail'
import Rewards from './pages/Rewards'
import Profile from './pages/Profile'
import AdminCommunity from './pages/AdminCommunity'
import { levelFor, useMyPoints } from './lib/community'
import { FEATURES } from './lib/features'
import { ROLE_LABEL, canDistribute } from './lib/roles'
import { applySurveyContent, type SurveyContent } from './lib/surveyContent'
import SurveyHome from './pages/SurveyHome'
import SpeakUp from './pages/SpeakUp'
import Initiatives from './pages/Initiatives'
import AdminCoverage from './pages/AdminCoverage'
import AdminSafeVoice from './pages/AdminSafeVoice'
import AdminResults from './pages/AdminResults'
import Join from './pages/Join'
import Results from './pages/Results'
import AdminSettings from './pages/AdminSettings'
import AdminQuestions from './pages/AdminQuestions'
import AdminInvitations from './pages/AdminInvitations'

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
  const isDistributor = canDistribute(role)
  const counts = useAdminCounts(Boolean(session) && isAdmin)
  const { balance, earned } = useMyPoints(session?.user.id)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => setMenuOpen(false), [location.pathname])

  // The survey wording the super admin may have changed: loaded once after sign-in, before the survey shows.
  const [contentReady, setContentReady] = useState(false)
  useEffect(() => {
    if (!session) return
    let gone = false
    void supabase.from('survey_content').select('content').eq('id', 1).maybeSingle().then(({ data }) => {
      if (gone) return
      applySurveyContent((data as { content: SurveyContent } | null)?.content)
      setContentReady(true)
    }, () => setContentReady(true))
    return () => { gone = true }
  }, [session])

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
  if (loading || (session && !contentReady && !location.pathname.startsWith('/join'))) return <div className="centered muted">Loading…</div>
  // Invitation links work before signing in; people who signed in without a company e-mail
  // must redeem an invitation before they can use anything.
  if (location.pathname.startsWith('/join')) return <Join />
  if (!session) return <Login />
  if (profile && profile.active === false) return <Join />

  const name = profile?.full_name || session.user.email || ''

  // Signed in without an e-mail = joined by invitation link: they couldn't sign back in.
  const linkGuest = !session.user.email || Boolean((session.user as { is_anonymous?: boolean }).is_anonymous) || (profile?.email ?? '').endsWith('@invite.local')

  // Staff see the survey and nothing else: no menu, no other pages.
  if (role === 'staff') {
    return (
      <div className="survey-only">
        <header className="survey-only-bar">
          <span className="brand" aria-label="TotalCare survey"><span className="logo small">TC</span> TotalCare survey <span lang="ar">· استبيان</span></span>
          <span className="survey-only-me">
            <span className="muted small">{name.endsWith('@invite.local') ? '' : name}</span>
            {/* People who joined by link have no e-mail to sign back in with, so they get no sign-out. */}
            {!linkGuest && (
              <button type="button" className="icon-btn" title="Sign out · خروج" aria-label="Sign out" onClick={() => supabase.auth.signOut()}><LogOut size={17} /></button>
            )}
          </span>
        </header>
        <main className="content survey-only-main">
          <Routes>
            <Route path="/" element={<SurveyHome surveyOnly />} />
            <Route path="/vision/:id" element={<VisionWizard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    )
  }
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

          <p className="nav-section">Your voice · صوتك</p>
          <NavLink to="/vision"><ClipboardList size={18} /> My survey</NavLink>
          <NavLink to="/speak-up"><ShieldCheck size={18} /> Speak up safely</NavLink>
          <NavLink to="/initiatives"><Rocket size={18} /> You said, we did</NavLink>
          {(role === 'management' || isAdmin) && <NavLink to="/results"><BarChart3 size={18} /> Results summary</NavLink>}

          {FEATURES.community && (
            <>
              <p className="nav-section">Community</p>
              <NavLink to="/ideas"><Lightbulb size={18} /> Ideas</NavLink>
              <NavLink to="/kudos"><Heart size={18} /> Kudos wall</NavLink>
              <NavLink to="/sectors"><LayoutGrid size={18} /> Sectors</NavLink>
              <NavLink to="/rewards"><Gift size={18} /> Rewards <span className="nav-pts">{balance}</span></NavLink>
              <NavLink to="/me"><UserRound size={18} /> My profile</NavLink>
              {role === 'management' && <NavLink to="/admin/community"><Sparkles size={18} /> Announcements</NavLink>}
            </>
          )}
          {FEATURES.orgChart && (
            <>
              <p className="nav-section">Our company</p>
              <NavLink to="/org"><Network size={18} /> Org chart</NavLink>
              <NavLink to="/directory"><BookUser size={18} /> Directory</NavLink>
            </>
          )}

          {isDistributor && (
            <>
              <p className="nav-section">Send the survey · وزّع الاستبيان</p>
              <NavLink to="/admin/invitations"><Send size={18} /> Invitations</NavLink>
              <NavLink to="/admin/coverage"><Megaphone size={18} /> Coverage</NavLink>
            </>
          )}

          {isAdmin && (
            <>
              <p className="nav-section">Super admin</p>
              <NavLink to="/admin" end><BarChart3 size={18} /> Full dashboard</NavLink>
              <NavLink to="/admin/inbox"><Inbox size={18} /> Responses <Badge n={counts.submissions + counts.feedback} /></NavLink>
              <NavLink to="/admin/safe-voice"><ShieldCheck size={18} /> Speak-up inbox</NavLink>
              {FEATURES.community && <NavLink to="/admin/community"><Sparkles size={18} /> Community</NavLink>}
              <NavLink to="/admin/questions"><ClipboardList size={18} /> Survey questions</NavLink>
              <NavLink to="/admin/directory"><BookUser size={18} /> Departments & people</NavLink>
              <NavLink to="/admin/users"><Users size={18} /> Users & roles</NavLink>
              <NavLink to="/admin/email"><Mail size={18} /> E-mail</NavLink>
              <NavLink to="/admin/settings"><Settings2 size={18} /> Settings</NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-foot">
          <FeedbackButton compact />
          <div className="me">
            <div className="avatar small">{initials(name)}</div>
            <div className="me-text">
              <div className="me-name">{name}</div>
              <div className="muted small">{FEATURES.community ? `${levelFor(earned).emoji} ${levelFor(earned).name} · ` : ''}{ROLE_LABEL[role] ?? role}</div>
            </div>
            <button type="button" className="icon-btn" title="Sign out" onClick={() => supabase.auth.signOut()}><LogOut size={17} /></button>
          </div>
        </div>
      </aside>
      {menuOpen && <div className="sidebar-scrim" onClick={() => setMenuOpen(false)} />}

      <main className="content">
        <Routes>
          <Route path="/" element={FEATURES.community ? <Home /> : <SurveyHome />} />
          <Route path="/vision" element={<MyVision />} />
          <Route path="/results" element={<RequireRole roles={['admin', 'management']}><Results /></RequireRole>} />
          <Route path="/vision/:id" element={<VisionWizard />} />
          <Route path="/speak-up" element={<SpeakUp />} />
          <Route path="/initiatives" element={<Initiatives />} />
          <Route path="/admin/coverage" element={<RequireRole roles={['admin', 'distributor']}><AdminCoverage /></RequireRole>} />
          <Route path="/admin/invitations" element={<RequireRole roles={['admin', 'distributor']}><AdminInvitations /></RequireRole>} />
          <Route path="/admin/safe-voice" element={<RequireRole roles={['admin']}><AdminSafeVoice /></RequireRole>} />
          {FEATURES.orgChart && <Route path="/org" element={<OrgChart />} />}
          {FEATURES.orgChart && <Route path="/directory" element={<Directory />} />}
          {FEATURES.community && (
            <>
              <Route path="/ideas" element={<Ideas />} />
              <Route path="/ideas/:id" element={<IdeaDetail />} />
              <Route path="/kudos" element={<KudosWall />} />
              <Route path="/sectors" element={<Sectors />} />
              <Route path="/sectors/:id" element={<SectorDetail />} />
              <Route path="/rewards" element={<Rewards />} />
              <Route path="/me" element={<Profile />} />
            </>
          )}
          {FEATURES.community && <Route path="/admin/community" element={<RequireRole roles={['management', 'admin']}><AdminCommunity /></RequireRole>} />}
          {/* Reports were built for the first survey; the results page replaces them. */}
          <Route path="/reports/*" element={<Navigate to="/results" replace />} />
          <Route path="/admin" element={<RequireRole roles={['admin']}><AdminResults /></RequireRole>} />
          <Route path="/admin/settings" element={<RequireRole roles={['admin']}><AdminSettings /></RequireRole>} />
          <Route path="/admin/questions" element={<RequireRole roles={['admin']}><AdminQuestions /></RequireRole>} />
          <Route path="/admin/pulse" element={<Navigate to="/admin/settings" replace />} />
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
