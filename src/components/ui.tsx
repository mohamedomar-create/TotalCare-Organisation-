import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import confetti from 'canvas-confetti'
import { initials } from '../lib/initials'
import type { Department } from '../lib/types'

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function celebrate() {
  if (reducedMotion()) return
  const colors = ['#0e7490', '#7c3aed', '#f59e0b', '#10b981', '#ec4899']
  confetti({ particleCount: 90, spread: 75, origin: { y: 0.7 }, colors, scalar: 0.9 })
  setTimeout(() => confetti({ particleCount: 50, spread: 110, origin: { y: 0.6 }, colors, scalar: 0.8 }), 180)
}

// Counts up from 0 to `value` the first time it appears.
export function CountUp({ value, duration = 900 }: { value: number; duration?: number }) {
  const [shown, setShown] = useState(reducedMotion() ? value : 0)
  const from = useRef(0)
  useEffect(() => {
    if (reducedMotion()) {
      setShown(value)
      return
    }
    const start = performance.now()
    const begin = from.current
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setShown(Math.round(begin + (value - begin) * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
      else from.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  return <>{shown.toLocaleString()}</>
}

export function PageHero({ kicker, title, ar, children, color, icon }: {
  kicker?: string
  title: string
  ar?: string
  children?: ReactNode
  color?: string
  icon?: ReactNode
}) {
  return (
    <section className="page-hero" style={color ? ({ '--hero': color } as React.CSSProperties) : undefined}>
      <div className="hero-orbs" aria-hidden="true"><span /><span /><span /></div>
      <div className="page-hero-inner">
        {icon && <div className="page-hero-icon">{icon}</div>}
        <div className="grow">
          {kicker && <p className="hero-kicker">{kicker}</p>}
          <h1>{title}</h1>
          {ar && <p className="hero-ar" lang="ar">{ar}</p>}
          {children}
        </div>
      </div>
    </section>
  )
}

export function Avatar({ name, color, size = 36 }: { name: string; color?: string; size?: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.36, background: color ?? 'linear-gradient(135deg,#0e7490,#7c3aed)' }}>
      {initials(name)}
    </span>
  )
}

export function SectorChip({ dept, link = true }: { dept?: Department; link?: boolean }) {
  if (!dept) return null
  const chip = (
    <span className="sector-chip" style={{ '--c': dept.color } as React.CSSProperties}>
      <i />{dept.name}
    </span>
  )
  return link ? <Link to={`/sectors/${dept.id}`} className="plain">{chip}</Link> : chip
}

export function Empty({ emoji, title, children }: { emoji: string; title: string; children?: ReactNode }) {
  return (
    <div className="empty-fancy">
      <div className="empty-emoji">{emoji}</div>
      <strong>{title}</strong>
      {children && <p className="muted">{children}</p>}
    </div>
  )
}
