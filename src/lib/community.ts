import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

/* ---------- types ---------- */

export interface StaffMember {
  id: string
  full_name: string
  job_title: string
  department_id: string | null
  joined_on: string | null
}

export type IdeaStatus = 'new' | 'review' | 'planned' | 'done' | 'declined'

export interface Idea {
  id: string
  title: string
  body: string
  department_id: string | null
  category: string
  author_id: string | null
  anonymous: boolean
  status: IdeaStatus
  admin_note: string
  votes: number
  comments: number
  hidden: boolean
  created_at: string
}

export interface IdeaComment {
  id: string
  idea_id: string
  author_id: string
  body: string
  created_at: string
}

export interface Kudos {
  id: string
  from_id: string
  to_id: string
  value: string
  message: string
  created_at: string
}

export interface Announcement {
  id: string
  title: string
  body: string
  pinned: boolean
  created_at: string
}

export interface Poll {
  id: string
  question: string
  question_ar: string
  options: string[]
  active: boolean
  created_at: string
}

export interface Reward {
  id: string
  title: string
  title_ar: string
  description: string
  cost: number
  emoji: string
  active: boolean
}

export interface Redemption {
  id: string
  user_id: string
  reward_id: string
  cost: number
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export interface LedgerRow {
  id: string
  user_id: string
  points: number
  reason: string
  created_at: string
}

/* ---------- labels ---------- */

export const IDEA_STATUS: Record<IdeaStatus, { label: string; ar: string; tone: string }> = {
  new: { label: 'New', ar: 'جديدة', tone: 'slate' },
  review: { label: 'Under review', ar: 'قيد الدراسة', tone: 'amber' },
  planned: { label: 'Planned', ar: 'مخطط لها', tone: 'blue' },
  done: { label: 'Done', ar: 'تم التنفيذ', tone: 'green' },
  declined: { label: 'Not now', ar: 'ليس الآن', tone: 'rose' },
}

export const IDEA_CATEGORIES = [
  { value: 'improvement', label: 'Better way of working', ar: 'طريقة شغل أحسن', emoji: '⚙️' },
  { value: 'customer', label: 'Customers & patients', ar: 'العملاء والمرضى', emoji: '🤝' },
  { value: 'cost', label: 'Save money / time', ar: 'توفير فلوس أو وقت', emoji: '💰' },
  { value: 'people', label: 'Our people', ar: 'فريقنا', emoji: '💚' },
  { value: 'process', label: 'Systems & Odoo', ar: 'الأنظمة و Odoo', emoji: '🖥️' },
  { value: 'other', label: 'Something else', ar: 'حاجة تانية', emoji: '✨' },
]

export const KUDOS_VALUES = [
  { value: 'teamwork', label: 'Teamwork', ar: 'روح الفريق', emoji: '🤝', color: '#0e7490' },
  { value: 'customer', label: 'Customer first', ar: 'العميل أولاً', emoji: '❤️', color: '#db2777' },
  { value: 'integrity', label: 'Integrity', ar: 'النزاهة', emoji: '🛡️', color: '#475569' },
  { value: 'innovation', label: 'Fresh idea', ar: 'فكرة جديدة', emoji: '💡', color: '#d97706' },
  { value: 'extra_mile', label: 'Extra mile', ar: 'مجهود إضافي', emoji: '🚀', color: '#7c3aed' },
  { value: 'helping', label: 'Always helping', ar: 'دايماً بيساعد', emoji: '🙌', color: '#059669' },
]

/* ---------- points, levels, badges ---------- */

export const LEVELS = [
  { min: 0, name: 'Newcomer', ar: 'جديد', emoji: '🌱' },
  { min: 100, name: 'Contributor', ar: 'مشارك', emoji: '⭐' },
  { min: 300, name: 'Champion', ar: 'بطل', emoji: '🏅' },
  { min: 700, name: 'Star', ar: 'نجم', emoji: '🌟' },
  { min: 1500, name: 'Legend', ar: 'أسطورة', emoji: '🏆' },
]

export function levelFor(earned: number) {
  let i = 0
  while (i + 1 < LEVELS.length && earned >= LEVELS[i + 1].min) i++
  const next = LEVELS[i + 1]
  const progress = next ? (earned - LEVELS[i].min) / (next.min - LEVELS[i].min) : 1
  return { ...LEVELS[i], index: i, next, progress: Math.max(0, Math.min(1, progress)) }
}

export const POINT_RULES = [
  { points: 50, label: 'Send the survey (once)', emoji: '📝' },
  { points: 10, label: 'Share an idea', emoji: '💡' },
  { points: 2, label: 'Each like on your idea', emoji: '👍' },
  { points: 25, label: 'Your idea is planned', emoji: '📅' },
  { points: 100, label: 'Your idea is put into action', emoji: '🚀' },
  { points: 10, label: 'A colleague thanks you', emoji: '🙏' },
  { points: 5, label: 'Thank a colleague (up to 5 a week)', emoji: '💌' },
  { points: 2, label: 'Answer the pulse poll', emoji: '📊' },
]

export const BADGES = [
  { key: 'voice', label: 'Voice heard', ar: 'صوتك وصل', emoji: '📣', test: (r: string[]) => r.includes('Shared your view in the survey') },
  { key: 'idea', label: 'Idea maker', ar: 'صاحب فكرة', emoji: '💡', test: (r: string[]) => r.includes('Shared an idea') },
  { key: 'impact', label: 'Made it happen', ar: 'فكرته اتنفذت', emoji: '🚀', test: (r: string[]) => r.includes('Your idea was put into action') },
  { key: 'thanker', label: 'Says thank you', ar: 'بيشكر زمايله', emoji: '💌', test: (r: string[]) => r.filter((x) => x === 'You thanked a colleague').length >= 3 },
  { key: 'loved', label: 'Team favourite', ar: 'محبوب الفريق', emoji: '💚', test: (r: string[]) => r.filter((x) => x === 'A colleague thanked you').length >= 3 },
  { key: 'pulse', label: 'Keeps in touch', ar: 'دايماً متواصل', emoji: '📊', test: (r: string[]) => r.filter((x) => x === 'Answered the pulse poll').length >= 3 },
]

/* ---------- hooks ---------- */

export function useStaff() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  useEffect(() => {
    supabase.rpc('staff_list').then(({ data }) => setStaff((data ?? []) as StaffMember[]))
  }, [])
  return staff
}

export function useMyPoints(userId: string | undefined) {
  const [ledger, setLedger] = useState<LedgerRow[]>([])
  const reload = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase.from('points_ledger').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    setLedger((data ?? []) as LedgerRow[])
  }, [userId])
  useEffect(() => {
    void reload()
  }, [reload])
  const balance = ledger.reduce((s, r) => s + r.points, 0)
  const earned = ledger.filter((r) => r.points > 0 && r.reason !== 'Reward request returned').reduce((s, r) => s + r.points, 0)
  const reasons = ledger.map((r) => r.reason)
  return { ledger, balance, earned, reasons, reload }
}

export function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`
  return new Date(iso).toLocaleDateString()
}
