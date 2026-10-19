import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/auth'
import { isConfigured, supabase } from './lib/supabase'
import type { Role } from './lib/types'
import Login from './pages/Login'
import OrgChart from './pages/OrgChart'
import Directory from './pages/Directory'
import MyVision from './pages/MyVision'
import VisionEdit from './pages/VisionEdit'
import AdminSubmissions from './pages/AdminSubmissions'
import AdminDirectory from './pages/AdminDirectory'
import AdminUsers from './pages/AdminUsers'
import Reports from './pages/Reports'
import ReportView from './pages/ReportView'

function RequireRole({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const { profile } = useAuth()
  if (!profile || !roles.includes(profile.role)) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  const { session, profile, loading } = useAuth()

  if (!isConfigured) {
    return (
      <div className="centered">
        <div className="card narrow">
          <h1>Setup needed</h1>
          <p>
            Copy <code>.env.example</code> to <code>.env</code> and fill in your Supabase URL and anon
            key, then restart the dev server. See the README.
          </p>
        </div>
      </div>
    )
  }
  if (loading) return <div className="centered">Loading…</div>
  if (!session) return <Login />

  const role = profile?.role ?? 'staff'

  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand">TotalCare Organisation</span>
        <nav>
          <NavLink to="/" end>Org chart</NavLink>
          <NavLink to="/directory">Directory</NavLink>
          <NavLink to="/vision">My vision</NavLink>
          {(role === 'management' || role === 'admin') && <NavLink to="/reports">Reports</NavLink>}
          {role === 'admin' && (
            <>
              <NavLink to="/admin/submissions">Submissions</NavLink>
              <NavLink to="/admin/directory">Edit directory</NavLink>
              <NavLink to="/admin/users">Users</NavLink>
            </>
          )}
        </nav>
        <span className="who">
          {profile?.full_name || session.user.email} · {role}
          <button className="link" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </span>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<OrgChart />} />
          <Route path="/directory" element={<Directory />} />
          <Route path="/vision" element={<MyVision />} />
          <Route path="/vision/:id" element={<VisionEdit />} />
          <Route
            path="/reports"
            element={<RequireRole roles={['management', 'admin']}><Reports /></RequireRole>}
          />
          <Route
            path="/reports/:id"
            element={<RequireRole roles={['management', 'admin']}><ReportView /></RequireRole>}
          />
          <Route
            path="/admin/submissions"
            element={<RequireRole roles={['admin']}><AdminSubmissions /></RequireRole>}
          />
          <Route
            path="/admin/directory"
            element={<RequireRole roles={['admin']}><AdminDirectory /></RequireRole>}
          />
          <Route
            path="/admin/users"
            element={<RequireRole roles={['admin']}><AdminUsers /></RequireRole>}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
