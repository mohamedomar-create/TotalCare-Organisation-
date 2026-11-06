import './demo/install'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import '@xyflow/react/dist/style.css'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './lib/auth.tsx'
import DemoBar from './demo/DemoBar'
import { DEMO, demoStart } from './demo/install'

const Router = ({ children }: { children: React.ReactNode }) =>
  DEMO ? <MemoryRouter initialEntries={[demoStart()]}>{children}</MemoryRouter> : <BrowserRouter>{children}</BrowserRouter>

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      {DEMO && <DemoBar />}
      <AuthProvider>
        <App />
      </AuthProvider>
    </Router>
  </StrictMode>,
)
