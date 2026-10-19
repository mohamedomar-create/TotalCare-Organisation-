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
