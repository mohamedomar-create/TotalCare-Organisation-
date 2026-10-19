import type { Department, Person, ShapeKind, Structure, VisionEdge, VisionNode } from '../../lib/types'
import { SHAPE_BY_KIND } from './shapes'
import { autoLayout } from './autoLayout'

interface Item {
  key: string
  label: string
  kind: ShapeKind
  parent?: string
  color?: string
  responsibilities?: string
}

function build(items: Item[], extraLinks: { from: string; to: string }[] = []): Structure {
  const ids = new Map(items.map((i) => [i.key, crypto.randomUUID()]))
  const nodes: VisionNode[] = items.map((i) => ({
    id: ids.get(i.key)!,
    label: i.label,
    responsibilities: i.responsibilities ?? '',
    kind: i.kind,
    color: i.color ?? SHAPE_BY_KIND[i.kind].color,
    x: 0,
    y: 0,
  }))
  const edges: VisionEdge[] = [
    ...items
      .filter((i) => i.parent)
      .map((i) => ({ id: crypto.randomUUID(), source: ids.get(i.parent!)!, target: ids.get(i.key)!, kind: 'reports' as const, sourceHandle: 'b', targetHandle: 't' })),
    ...extraLinks.map((l) => ({ id: crypto.randomUUID(), source: ids.get(l.from)!, target: ids.get(l.to)!, kind: 'collaborates' as const, sourceHandle: 'r', targetHandle: 'l' })),
  ]
  return autoLayout({ nodes, edges })
}

export interface Template {
  key: string
  name: string
  description: string
  make: () => Structure
}

export function templates(people: Person[], departments: Department[]): Template[] {
  const list: Template[] = [
    {
      key: 'blank',
      name: 'Blank canvas',
      description: 'Start from nothing and add shapes yourself.',
      make: () => ({ nodes: [], edges: [] }),
    },
    {
      key: 'functional',
      name: 'Functional hierarchy',
      description: 'Classic: a leader, department heads, then roles.',
      make: () =>
        build([
          { key: 'ceo', label: 'General Manager', kind: 'leader' },
          { key: 'ops', label: 'Operations', kind: 'department', parent: 'ceo', color: '#2563eb' },
          { key: 'sales', label: 'Sales', kind: 'department', parent: 'ceo', color: '#059669' },
          { key: 'fin', label: 'Finance', kind: 'department', parent: 'ceo', color: '#d97706' },
          { key: 'hr', label: 'Human Resources', kind: 'department', parent: 'ceo', color: '#db2777' },
          { key: 'ops1', label: 'Coordinator', kind: 'role', parent: 'ops' },
          { key: 'ops2', label: 'Field supervisor', kind: 'role', parent: 'ops' },
          { key: 'sales1', label: 'Account manager', kind: 'role', parent: 'sales' },
          { key: 'fin1', label: 'Accountant', kind: 'role', parent: 'fin' },
          { key: 'hr1', label: 'HR officer', kind: 'role', parent: 'hr' },
        ]),
    },
    {
      key: 'flat',
      name: 'Flat teams',
      description: 'Few layers: one leader and self-managing teams.',
      make: () =>
        build([
          { key: 'lead', label: 'Leadership team', kind: 'leader' },
          { key: 't1', label: 'Client team', kind: 'team', parent: 'lead' },
          { key: 't2', label: 'Delivery team', kind: 'team', parent: 'lead' },
          { key: 't3', label: 'Growth team', kind: 'team', parent: 'lead' },
          { key: 't4', label: 'Support team', kind: 'team', parent: 'lead' },
        ]),
    },
    {
      key: 'matrix',
      name: 'Matrix',
      description: 'Departments plus cross-team projects (dashed = works with).',
      make: () =>
        build(
          [
            { key: 'gm', label: 'General Manager', kind: 'leader' },
            { key: 'ops', label: 'Operations', kind: 'department', parent: 'gm', color: '#2563eb' },
            { key: 'sales', label: 'Sales', kind: 'department', parent: 'gm', color: '#059669' },
            { key: 'fin', label: 'Finance', kind: 'department', parent: 'gm', color: '#d97706' },
            { key: 'p1', label: 'Project A team', kind: 'team', parent: 'ops', color: '#7c3aed' },
            { key: 'p2', label: 'Project B team', kind: 'team', parent: 'sales', color: '#7c3aed' },
          ],
          [
            { from: 'fin', to: 'p1' },
            { from: 'sales', to: 'p1' },
            { from: 'ops', to: 'p2' },
          ],
        ),
    },
    {
      key: 'client',
      name: 'Client-centred',
      description: 'Every team linked around serving the client.',
      make: () =>
        build(
          [
            { key: 'client', label: 'Our clients', kind: 'leader', color: '#0e7490' },
            { key: 'front', label: 'Front-line service', kind: 'team', parent: 'client' },
            { key: 'sales', label: 'Sales & accounts', kind: 'team', parent: 'client' },
            { key: 'back', label: 'Back-office support', kind: 'team', parent: 'front' },
            { key: 'quality', label: 'Quality', kind: 'team', parent: 'front' },
          ],
          [{ from: 'sales', to: 'front' }],
        ),
    },
  ]

  if (people.length > 0) {
    list.splice(1, 0, {
      key: 'current',
      name: 'Current org chart',
      description: 'Start from today’s structure and change what you’d improve.',
      make: () => {
        const dept = new Map(departments.map((d) => [d.id, d]))
        const ids = new Set(people.map((p) => p.id))
        return build(
          people.map((p) => ({
            key: p.id,
            label: p.title || p.full_name,
            kind: p.manager_id && ids.has(p.manager_id) ? 'role' : 'leader',
            parent: p.manager_id && ids.has(p.manager_id) ? p.manager_id : undefined,
            color: p.department_id ? dept.get(p.department_id)?.color : undefined,
          })),
        )
      },
    })
  }
  return list
}
