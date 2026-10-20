import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Idea } from './community'

export function useIdeas(userId: string | undefined, departmentId?: string) {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    let q = supabase.from('ideas').select('*').order('created_at', { ascending: false })
    if (departmentId) q = q.eq('department_id', departmentId)
    const [i, v] = await Promise.all([q, userId ? supabase.from('idea_votes').select('idea_id').eq('user_id', userId) : Promise.resolve({ data: [] })])
    setIdeas((i.data ?? []) as Idea[])
    setMyVotes(new Set(((v.data ?? []) as { idea_id: string }[]).map((x) => x.idea_id)))
    setLoading(false)
  }, [userId, departmentId])

  useEffect(() => {
    void reload()
  }, [reload])

  async function toggleVote(idea: Idea) {
    const voted = myVotes.has(idea.id)
    // Optimistic update so the button reacts instantly.
    setMyVotes((s) => {
      const n = new Set(s)
      if (voted) n.delete(idea.id)
      else n.add(idea.id)
      return n
    })
    setIdeas((list) => list.map((x) => (x.id === idea.id ? { ...x, votes: x.votes + (voted ? -1 : 1) } : x)))
    const { error } = voted
      ? await supabase.from('idea_votes').delete().eq('idea_id', idea.id).eq('user_id', userId!)
      : await supabase.from('idea_votes').insert({ idea_id: idea.id })
    if (error) void reload()
  }

  return { ideas, myVotes, loading, reload, toggleVote }
}
