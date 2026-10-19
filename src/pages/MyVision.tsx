import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { Submission } from '../lib/types'
import PrivacyNotice from '../components/PrivacyNotice'

export default function MyVision() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<Submission[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('submissions')
      .select('*')
      .eq('author_id', session!.user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        setError(error?.message ?? null)
        setItems((data ?? []) as Submission[])
      })
  }, [session])

  async function create() {
    const { data, error } = await supabase.from('submissions').insert({}).select().single()
    if (error) setError(error.message)
    else navigate(`/vision/${data.id}`)
  }

  return (
    <div className="page">
      <h1>My vision for the organisation</h1>
      <p>
        Draw how you think the organisation should be structured, describe the responsibilities of each role,
        and tell us about the challenges you face and what would help.
      </p>
      <PrivacyNotice />
      <button onClick={create}>+ Start a new submission</button>
      {error && <p className="error">{error}</p>}
      <ul className="list">
        {items.map((s) => (
          <li key={s.id} className="card">
            <Link to={`/vision/${s.id}`}>
              {s.status === 'draft' ? 'Draft' : 'Submitted'} · started {new Date(s.created_at).toLocaleDateString()}
            </Link>
            <span className="muted"> · {s.structure.nodes.length} boxes</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
