export type Role = 'staff' | 'management' | 'admin'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: Role
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

export interface VisionNode {
  id: string
  label: string
  responsibilities: string
  x: number
  y: number
}

export interface VisionEdge {
  id: string
  source: string
  target: string
}

export interface Structure {
  nodes: VisionNode[]
  edges: VisionEdge[]
}

export interface Submission {
  id: string
  author_id: string
  department_id: string | null
  structure: Structure
  responsibilities: string
  challenges: string
  suggestions: string
  status: 'draft' | 'submitted'
  created_at: string
  updated_at: string
  submitted_at: string | null
}

export interface ReportStats {
  total: number
  byDepartment: { name: string; count: number }[]
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
