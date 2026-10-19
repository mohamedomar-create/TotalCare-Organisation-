import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Department, Person } from './types'

export function useDirectory() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const [d, p] = await Promise.all([
      supabase.from('departments').select('*').order('name'),
      supabase.from('people').select('*').order('full_name'),
    ])
    setError(d.error?.message ?? p.error?.message ?? null)
    setDepartments((d.data ?? []) as Department[])
    setPeople((p.data ?? []) as Person[])
    setLoading(false)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { departments, people, loading, error, reload }
}
