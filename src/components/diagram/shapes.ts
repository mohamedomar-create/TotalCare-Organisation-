import { Building2, Crown, StickyNote, SquareDashed, User, UserSquare2, Users, type LucideIcon } from 'lucide-react'
import type { ShapeKind } from '../../lib/types'

export interface ShapeDef {
  kind: ShapeKind
  label: string
  hint: string
  icon: LucideIcon
  defaultLabel: string
  color: string
  width?: number
  height?: number
}

export const SHAPES: ShapeDef[] = [
  { kind: 'leader', label: 'Leader', hint: 'CEO, director, head', icon: Crown, defaultLabel: 'Leader', color: '#1e293b' },
  { kind: 'department', label: 'Department', hint: 'A whole department', icon: Building2, defaultLabel: 'Department', color: '#2563eb' },
  { kind: 'team', label: 'Team', hint: 'A group of people', icon: Users, defaultLabel: 'Team', color: '#059669' },
  { kind: 'role', label: 'Role', hint: 'A job / position', icon: UserSquare2, defaultLabel: 'Role', color: '#0e7490' },
  { kind: 'person', label: 'Person', hint: 'A named person', icon: User, defaultLabel: 'Name', color: '#7c3aed' },
  { kind: 'note', label: 'Sticky note', hint: 'A comment or idea', icon: StickyNote, defaultLabel: 'Write a note…', color: '#facc15', width: 180, height: 140 },
  { kind: 'zone', label: 'Area', hint: 'Group boxes together', icon: SquareDashed, defaultLabel: 'Area', color: '#64748b', width: 420, height: 260 },
]

export const SHAPE_BY_KIND = Object.fromEntries(SHAPES.map((s) => [s.kind, s])) as Record<ShapeKind, ShapeDef>

export const PALETTE_COLORS = [
  '#1e293b', '#2563eb', '#0e7490', '#059669', '#65a30d', '#d97706', '#dc2626', '#db2777', '#7c3aed', '#64748b', '#facc15',
]

export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || '?'
  )
}
