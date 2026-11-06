import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { demo as maybeDemo, type DemoView } from './install'

const VIEWS: [DemoView, string][] = [['invite', 'Invitation link'], ['staff', 'Employee'], ['distributor', 'Survey admin'], ['admin', 'Super admin']]

/** Demo mode only: a strip to switch between the views, and plain links routed in-app. */
export default function DemoBar() {
  const navigate = useNavigate()
  useEffect(() => {
    document.body.classList.add('demo')
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.('a[href^="/"]') as HTMLAnchorElement | null
      if (!a || a.target === '_blank' || e.defaultPrevented) return
      e.preventDefault()
      navigate(a.getAttribute('href')!)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [navigate])
  const demo = maybeDemo!
  const view = demo.view()
  const go = (v: DemoView) => { demo.switchTo(v); window.location.reload() }
  return (
    <div className="demo-bar" role="note">
      <span><strong>Demo</strong> · sample data, nothing is sent to TotalCare · <span lang="ar" dir="rtl">نسخة تجريبية</span></span>
      <span className="demo-bar-actions">
        {VIEWS.map(([v, label]) => <button key={v} type="button" className={view === v ? 'on' : ''} onClick={() => go(v)}>{label}</button>)}
        <button type="button" onClick={() => { demo.reset(); window.location.reload() }}>Reset</button>
      </span>
    </div>
  )
}
