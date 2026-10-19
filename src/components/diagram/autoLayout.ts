import { layoutTree } from '../../lib/layout'
import type { Structure } from '../../lib/types'

// Arranges boxes as a top-down tree using "reports to" lines. Notes and areas keep their place.
export function autoLayout(structure: Structure): Structure {
  const boxes = structure.nodes.filter((n) => n.kind !== 'note' && n.kind !== 'zone')
  const managerOf = new Map<string, string>()
  for (const e of structure.edges) {
    if ((e.kind ?? 'reports') === 'reports' && !managerOf.has(e.target)) managerOf.set(e.target, e.source)
  }
  const positions = layoutTree(boxes.map((b) => ({ id: b.id, manager_id: managerOf.get(b.id) ?? null })))
  return {
    ...structure,
    nodes: structure.nodes.map((n) => {
      const p = positions.get(n.id)
      return p ? { ...n, x: p.x, y: p.y } : n
    }),
  }
}
