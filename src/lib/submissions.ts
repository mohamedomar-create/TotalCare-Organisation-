import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Submission } from './types'

export function useMySubmissions(userId: string | undefined) {
  const [items, setItems] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!userId) return
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
    setError(error?.message ?? null)
    setItems((data ?? []) as Submission[])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    void reload()
  }, [reload])

  return { items, loading, error, reload }
}

export async function createSubmission() {
  const { data, error } = await supabase.from('submissions').insert({}).select('id').single()
  if (error) throw new Error(error.message)
  return data.id as string
}

// How many surveys this person may start (set by the admin) and how many they already have.
export function useAllowance(userId: string | undefined) {
  const [allowance, setAllowance] = useState<{ allowed: number; used: number } | null>(null)
  const reload = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase.rpc('my_submission_allowance')
    const row = (Array.isArray(data) ? data[0] : data) as { allowed: number; used: number } | null
    setAllowance(row ? { allowed: Number(row.allowed), used: Number(row.used) } : null)
  }, [userId])
  useEffect(() => {
    void reload()
  }, [reload])
  // Unknown (still loading or offline) counts as allowed; the database has the final say.
  return { allowance, canStart: !allowance || allowance.used < allowance.allowed, reload }
}
