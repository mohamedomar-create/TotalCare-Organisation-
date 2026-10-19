import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useDirectory } from '../lib/useDirectory'
import type { Submission } from '../lib/types'
import StructureEditor from '../components/StructureEditor'
import PrivacyNotice from '../components/PrivacyNotice'

export default function VisionEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { departments } = useDirectory()
  const [sub, setSub] = useState<Submission | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<'saved' | 'saving' | 'dirty'>('saved')
  const pending = useRef<Partial<Submission>>({})
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    supabase
      .from('submissions')
      .select('*')
      .eq('id', id!)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setSub(data as Submission)
      })
  }, [id])

  const readOnly = sub?.status !== 'draft'

  async function flush() {
    window.clearTimeout(timer.current)
    const patch = pending.current
    pending.current = {}
    if (Object.keys(patch).length === 0) return true
    setSaved('saving')
    const { error } = await supabase.from('submissions').update(patch).eq('id', id!)
    if (error) {
      setError(error.message)
      return false
    }
    setSaved('saved')
    return true
  }

  // Autosave a moment after the last change.
  function change(patch: Partial<Submission>) {
    setSub((s) => (s ? { ...s, ...patch } : s))
    pending.current = { ...pending.current, ...patch }
    setSaved('dirty')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => void flush(), 1200)
  }

  async function submit() {
    if (!confirm('Submit now? You will not be able to edit it afterwards.')) return
    if (!(await flush())) return
    const { error } = await supabase.from('submissions').update({ status: 'submitted' }).eq('id', id!)
    if (error) setError(error.message)
    else navigate('/vision')
  }

  async function remove() {
    if (!confirm('Delete this draft?')) return
    window.clearTimeout(timer.current)
    pending.current = {}
    const { error } = await supabase.from('submissions').delete().eq('id', id!)
    if (error) setError(error.message)
    else navigate('/vision')
  }

  if (error) return <p className="error">{error}</p>
  if (!sub) return <p>Loading…</p>

  return (
    <div className="page wide">
      <div className="row between">
        <h1>{readOnly ? 'Your submission' : 'Edit your vision'}</h1>
        {!readOnly && <span className="muted">{saved === 'saved' ? 'All changes saved' : saved === 'saving' ? 'Saving…' : 'Unsaved changes'}</span>}
      </div>
      <PrivacyNotice />

      <label>
        Your department
        <select
          disabled={readOnly}
          value={sub.department_id ?? ''}
          onChange={(e) => change({ department_id: e.target.value || null })}
        >
          <option value="">Prefer not to say</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </label>

      <h2>1. Draw the structure you'd like to see</h2>
      <StructureEditor key={sub.id} value={sub.structure} readOnly={readOnly} onChange={(structure) => change({ structure })} />

      <h2>2. Responsibilities</h2>
      <p className="muted">What should your role (and your team) be responsible for? What's unclear today?</p>
      <textarea rows={5} disabled={readOnly} value={sub.responsibilities} onChange={(e) => change({ responsibilities: e.target.value })} />

      <h2>3. Challenges</h2>
      <p className="muted">What gets in the way of doing your job well?</p>
      <textarea rows={5} disabled={readOnly} value={sub.challenges} onChange={(e) => change({ challenges: e.target.value })} />

      <h2>4. Suggestions</h2>
      <p className="muted">What would you change? Anything else management should hear?</p>
      <textarea rows={5} disabled={readOnly} value={sub.suggestions} onChange={(e) => change({ suggestions: e.target.value })} />

      {!readOnly && (
        <div className="row">
          <button onClick={submit}>Submit</button>
          <button className="secondary" onClick={() => void flush().then(() => navigate('/vision'))}>Save draft & close</button>
          <button className="danger" onClick={remove}>Delete draft</button>
        </div>
      )}
    </div>
  )
}
