import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Feedback, Profile, Submission, SubmissionReview } from './types'

export function useAdminData() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [reviews, setReviews] = useState<Map<string, SubmissionReview>>(new Map())
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const [s, r, f, p] = await Promise.all([
      supabase.from('submissions').select('*').order('updated_at', { ascending: false }),
      supabase.from('submission_reviews').select('*'),
      supabase.from('feedback').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*'),
    ])
    setError(s.error?.message ?? r.error?.message ?? f.error?.message ?? p.error?.message ?? null)
    setSubmissions((s.data ?? []) as Submission[])
    setReviews(new Map(((r.data ?? []) as SubmissionReview[]).map((x) => [x.submission_id, x])))
    setFeedback((f.data ?? []) as Feedback[])
    setProfiles((p.data ?? []) as Profile[])
    setLoading(false)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { submissions, reviews, feedback, profiles, loading, error, reload }
}
