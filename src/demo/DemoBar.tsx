import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { demo as maybeDemo } from './install'

/** Demo mode only: a strip to switch between the staff and admin views, and plain links routed in-app. */
export default function DemoBar() {
  const navigate = useNavigate()
  useEffect(() => {
    document.body.classList.add('demo')
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.('a[href^="/"]') as HTMLAnchorElement | null
      if (!a || a.target === '_blank') return
      e.preventDefault()
      navigate(a.getAttribute('href')!)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [navigate])
  const demo = maybeDemo!
  const role = demo.role()
  const go = (r: 'staff' | 'admin') => { demo.switchTo(r); window.location.reload() }
  return (
    <div className="demo-bar" role="note">
      <span><strong>Demo</strong> · sample data, nothing is sent to TotalCare · <span lang="ar" dir="rtl">نسخة تجريبية</span></span>
      <span className="demo-bar-actions">
        <button type="button" className={role === 'staff' ? 'on' : ''} onClick={() => go('staff')}>Employee view</button>
        <button type="button" className={role === 'admin' ? 'on' : ''} onClick={() => go('admin')}>Admin dashboard</button>
        <button type="button" onClick={() => { demo.reset(); window.location.reload() }}>Reset</button>
      </span>
    </div>
  )
}
