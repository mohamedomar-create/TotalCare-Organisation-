import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from './supabase'

// Unread items waiting for the admin: submitted entries not yet reviewed, plus new feedback.
export function useAdminCounts(enabled: boolean) {
  const location = useLocation()
  const [counts, setCounts] = useState({ submissions: 0, feedback: 0 })

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    Promise.all([
      supabase.from('submissions').select('id').eq('status', 'submitted'),
      supabase.from('submission_reviews').select('submission_id, status'),
      supabase.from('feedback').select('id').eq('status', 'new'),
    ]).then(([s, r, f]) => {
      if (cancelled) return
      const reviewed = new Set((r.data ?? []).filter((x) => x.status !== 'new').map((x) => x.submission_id))
      setCounts({
        submissions: (s.data ?? []).filter((x) => !reviewed.has(x.id)).length,
        feedback: (f.data ?? []).length,
      })
    })
    return () => {
      cancelled = true
    }
  }, [enabled, location.pathname])

  return counts
}
