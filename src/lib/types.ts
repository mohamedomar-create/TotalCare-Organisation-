export type Role = 'staff' | 'management' | 'admin'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: Role
  created_at?: string
}

export interface Department {
  id: string
  name: string
  description: string
  color: string
}

export interface Person {
  id: string
  full_name: string
  title: string
  department_id: string | null
  manager_id: string | null
  email: string
  phone: string
  location: string
}

export type ShapeKind = 'leader' | 'department' | 'team' | 'role' | 'person' | 'note' | 'zone'
export type LinkKind = 'reports' | 'collaborates'

export interface VisionNode {
  id: string
  label: string
  responsibilities: string
  x: number
  y: number
  kind?: ShapeKind
  color?: string
  width?: number
  height?: number
}

export interface VisionEdge {
  id: string
  source: string
  target: string
  kind?: LinkKind
  label?: string
  sourceHandle?: string
  targetHandle?: string
}

export interface Structure {
  nodes: VisionNode[]
  edges: VisionEdge[]
}

export interface Submission {
  id: string
  author_id: string
  department_id: string | null
  role_level: string
  ratings: Record<string, number>
  responsibility_tags: string[]
  responsibilities: string
  challenge_tags: string[]
  challenges: string
  structure: Structure
  ideas: string[]
  quick_win: string
  suggestions: string
  enps: number | null
  current_step: number
  status: 'draft' | 'submitted'
  created_at: string
  updated_at: string
  submitted_at: string | null
}

export type ReviewStatus = 'new' | 'reviewed' | 'actioned'

export interface SubmissionReview {
  submission_id: string
  status: ReviewStatus
  notes: string
  updated_at: string
}

export type FeedbackCategory = 'idea' | 'issue' | 'question' | 'praise'

export interface Feedback {
  id: string
  author_id: string
  category: FeedbackCategory
  message: string
  status: 'new' | 'read' | 'done'
  created_at: string
}

export interface ReportStats {
  total: number
  byDepartment: { name: string; count: number }[]
  ratings?: { key: string; label: string; average: number; count: number }[]
  challenges?: { label: string; count: number }[]
  enps?: { score: number; count: number } | null
}

export interface Report {
  id: string
  title: string
  summary: string
  stats: ReportStats
  structures: Structure[]
  published: boolean
  published_at: string | null
  created_at: string
}
