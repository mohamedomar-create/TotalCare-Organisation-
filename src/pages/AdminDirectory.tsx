import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useDirectory } from '../lib/useDirectory'
import type { Department, Person } from '../lib/types'

const emptyPerson: Omit<Person, 'id'> = {
  full_name: '',
  title: '',
  department_id: null,
  manager_id: null,
  email: '',
  phone: '',
  location: '',
}

export default function AdminDirectory() {
  const { departments, people, reload } = useDirectory()
  const [person, setPerson] = useState<Partial<Person>>(emptyPerson)
  const [dept, setDept] = useState<Partial<Department>>({ name: '', description: '', color: '#2563eb' })
  const [error, setError] = useState<string | null>(null)

  async function run(op: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await op
    setError(error?.message ?? null)
    if (!error) await reload()
    return !error
  }

  async function savePerson(e: React.FormEvent) {
    e.preventDefault()
    const { id, ...fields } = person
    const ok = await run(id ? supabase.from('people').update(fields).eq('id', id) : supabase.from('people').insert(fields))
    if (ok) setPerson(emptyPerson)
  }

  async function saveDept(e: React.FormEvent) {
    e.preventDefault()
    const { id, ...fields } = dept
    const ok = await run(id ? supabase.from('departments').update(fields).eq('id', id) : supabase.from('departments').insert(fields))
    if (ok) setDept({ name: '', description: '', color: '#2563eb' })
  }

  return (
    <div className="page wide">
      <h1>Edit directory</h1>
      {error && <p className="error">{error}</p>}

      <section className="two-col">
        <form className="card" onSubmit={savePerson}>
          <h2>{person.id ? 'Edit person' : 'Add person'}</h2>
          <label>Full name<input required value={person.full_name ?? ''} onChange={(e) => setPerson({ ...person, full_name: e.target.value })} /></label>
          <label>Job title<input value={person.title ?? ''} onChange={(e) => setPerson({ ...person, title: e.target.value })} /></label>
          <label>
            Department
            <select value={person.department_id ?? ''} onChange={(e) => setPerson({ ...person, department_id: e.target.value || null })}>
              <option value="">—</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
          <label>
            Reports to
            <select value={person.manager_id ?? ''} onChange={(e) => setPerson({ ...person, manager_id: e.target.value || null })}>
              <option value="">— (top of the chart)</option>
              {people.filter((p) => p.id !== person.id).map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </label>
          <label>E-mail<input type="email" value={person.email ?? ''} onChange={(e) => setPerson({ ...person, email: e.target.value })} /></label>
          <label>Phone<input value={person.phone ?? ''} onChange={(e) => setPerson({ ...person, phone: e.target.value })} /></label>
          <label>Location<input value={person.location ?? ''} onChange={(e) => setPerson({ ...person, location: e.target.value })} /></label>
          <div className="row">
            <button type="submit">{person.id ? 'Save' : 'Add'}</button>
            {person.id && <button type="button" className="secondary" onClick={() => setPerson(emptyPerson)}>Cancel</button>}
          </div>
        </form>

        <form className="card" onSubmit={saveDept}>
          <h2>{dept.id ? 'Edit department' : 'Add department'}</h2>
          <label>Name<input required value={dept.name ?? ''} onChange={(e) => setDept({ ...dept, name: e.target.value })} /></label>
          <label>Description<input value={dept.description ?? ''} onChange={(e) => setDept({ ...dept, description: e.target.value })} /></label>
          <label>Colour<input type="color" value={dept.color ?? '#2563eb'} onChange={(e) => setDept({ ...dept, color: e.target.value })} /></label>
          <div className="row">
            <button type="submit">{dept.id ? 'Save' : 'Add'}</button>
            {dept.id && <button type="button" className="secondary" onClick={() => setDept({ name: '', description: '', color: '#2563eb' })}>Cancel</button>}
          </div>
          <ul className="list compact">
            {departments.map((d) => (
              <li key={d.id}>
                <span className="swatch" style={{ background: d.color }} /> {d.name}
                <button type="button" className="link" onClick={() => setDept(d)}>Edit</button>
                <button
                  type="button"
                  className="link danger"
                  onClick={() => confirm(`Delete ${d.name}?`) && void run(supabase.from('departments').delete().eq('id', d.id))}
                >Delete</button>
              </li>
            ))}
          </ul>
        </form>
      </section>

      <h2>People ({people.length})</h2>
      <table>
        <thead><tr><th>Name</th><th>Title</th><th>Department</th><th>Reports to</th><th /></tr></thead>
        <tbody>
          {people.map((p) => (
            <tr key={p.id}>
              <td>{p.full_name}</td>
              <td>{p.title}</td>
              <td>{departments.find((d) => d.id === p.department_id)?.name ?? '—'}</td>
              <td>{people.find((m) => m.id === p.manager_id)?.full_name ?? '—'}</td>
              <td>
                <button className="link" onClick={() => setPerson(p)}>Edit</button>
                <button
                  className="link danger"
                  onClick={() => confirm(`Delete ${p.full_name}?`) && void run(supabase.from('people').delete().eq('id', p.id))}
                >Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
