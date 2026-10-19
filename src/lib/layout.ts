// Simple top-down tree layout for the org chart: each leaf gets its own column,
// parents are centred above their children.

export const NODE_W = 220
export const NODE_H = 90
const GAP_X = 30
const GAP_Y = 70

export function layoutTree<T extends { id: string; manager_id: string | null }>(items: T[]) {
  const ids = new Set(items.map((i) => i.id))
  const children = new Map<string, T[]>()
  const roots: T[] = []
  for (const item of items) {
    if (item.manager_id && ids.has(item.manager_id)) {
      const list = children.get(item.manager_id) ?? []
      list.push(item)
      children.set(item.manager_id, list)
    } else {
      roots.push(item)
    }
  }

  const positions = new Map<string, { x: number; y: number }>()
  const visited = new Set<string>()
  let nextColumn = 0

  // Returns the x-centre of the placed subtree.
  function place(item: T, depth: number): number {
    visited.add(item.id)
    const kids = (children.get(item.id) ?? []).filter((k) => !visited.has(k.id))
    let x: number
    if (kids.length === 0) {
      x = nextColumn * (NODE_W + GAP_X)
      nextColumn += 1
    } else {
      const xs = kids.map((k) => place(k, depth + 1))
      x = (xs[0] + xs[xs.length - 1]) / 2
    }
    positions.set(item.id, { x, y: depth * (NODE_H + GAP_Y) })
    return x
  }

  for (const root of roots) place(root, 0)
  // Anything left unplaced is part of a manager cycle; put it on its own row.
  for (const item of items) if (!visited.has(item.id)) place(item, 0)

  return positions
}
