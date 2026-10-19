import { useMemo, useState } from 'react'
import { useDirectory } from '../lib/useDirectory'

export default function Directory() {
  const { departments, people, loading, error } = useDirectory()
  const [query, setQuery] = useState('')
  const [dept, setDept] = useState('')
  const deptById = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments])
  const nameById = useMemo(() => new Map(people.map((p) => [p.id, p.full_name])), [people])

  const filtered = people.filter((p) => {
    const q = query.trim().toLowerCase()
    const matches = !q || [p.full_name, p.title, p.email, p.phone].some((f) => f.toLowerCase().includes(q))
    return matches && (!dept || p.department_id === dept)
  })

  if (loading) return <p>Loading…</p>
  if (error) return <p className="error">{error}</p>

  return (
    <div>
      <div className="toolbar">
        <input placeholder="Search name, title, e-mail…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select value={dept} onChange={(e) => setDept(e.target.value)}>
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>
      <div className="grid">
        {filtered.map((p) => {
          const d = p.department_id ? deptById.get(p.department_id) : undefined
          return (
            <div key={p.id} className="card person" style={{ borderTopColor: d?.color }}>
              <strong>{p.full_name}</strong>
              <span>{p.title}</span>
              {d && <span className="muted">{d.name}</span>}
              {p.manager_id && <span className="muted">Reports to {nameById.get(p.manager_id)}</span>}
              {p.email && <a href={`mailto:${p.email}`}>{p.email}</a>}
              {p.phone && <a href={`tel:${p.phone}`}>{p.phone}</a>}
              {p.location && <span className="muted">{p.location}</span>}
            </div>
          )
        })}
        {filtered.length === 0 && <p className="muted">No matches.</p>}
      </div>
    </div>
  )
}
