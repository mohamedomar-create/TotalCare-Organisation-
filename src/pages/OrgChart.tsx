import { useMemo, useState } from 'react'
import { Background, Controls, ReactFlow, type Edge, type Node } from '@xyflow/react'
import { useDirectory } from '../lib/useDirectory'
import { layoutTree, NODE_W } from '../lib/layout'
import type { Person } from '../lib/types'
import { initials } from '../lib/initials'

export default function OrgChart() {
  const { departments, people, loading, error } = useDirectory()
  const [selected, setSelected] = useState<Person | null>(null)
  const deptById = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments])

  const { nodes, edges } = useMemo(() => {
    const positions = layoutTree(people)
    const nodes: Node[] = people.map((p) => {
      const dept = p.department_id ? deptById.get(p.department_id) : undefined
      return {
        id: p.id,
        position: positions.get(p.id) ?? { x: 0, y: 0 },
        data: {
          label: (
            <div className="person-node">
              <div className="avatar" style={{ background: dept?.color ?? '#64748b' }}>{initials(p.full_name)}</div>
              <div>
                <strong>{p.full_name}</strong>
                <span>{p.title}</span>
                {dept && <em>{dept.name}</em>}
              </div>
            </div>
          ),
        },
        className: 'org-node',
        style: { width: NODE_W, borderTop: `4px solid ${dept?.color ?? '#94a3b8'}` },
        draggable: false,
      }
    })
    const ids = new Set(people.map((p) => p.id))
    const edges: Edge[] = people
      .filter((p) => p.manager_id && ids.has(p.manager_id))
      .map((p) => ({ id: `${p.manager_id}-${p.id}`, source: p.manager_id!, target: p.id, type: 'smoothstep' }))
    return { nodes, edges }
  }, [people, deptById])

  if (loading) return <p>Loading…</p>
  if (error) return <p className="error">{error}</p>
  if (people.length === 0) return <p className="muted">No people in the directory yet. An admin can add them under “Edit directory”.</p>

  const manager = selected?.manager_id ? people.find((p) => p.id === selected.manager_id) : undefined

  return (
    <div className="page wide">
      <div className="row between">
        <h1>Org chart</h1>
        <span className="muted small">{people.length} people · {departments.length} departments · click a person for details</span>
      </div>
    <div className="chart-page">
      <div className="chart">
        <ReactFlow
          proOptions={{ hideAttribution: true }}
          nodes={nodes}
          edges={edges}
          fitView
          nodesConnectable={false}
          onNodeClick={(_, n) => setSelected(people.find((p) => p.id === n.id) ?? null)}
        >
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      {selected && (
        <aside className="card side">
          <button className="link close" onClick={() => setSelected(null)}>×</button>
          <h2>{selected.full_name}</h2>
          <p>{selected.title}</p>
          <dl>
            <dt>Department</dt>
            <dd>{selected.department_id ? deptById.get(selected.department_id)?.name : '—'}</dd>
            <dt>Reports to</dt>
            <dd>{manager?.full_name ?? '—'}</dd>
            <dt>E-mail</dt>
            <dd>{selected.email ? <a href={`mailto:${selected.email}`}>{selected.email}</a> : '—'}</dd>
            <dt>Phone</dt>
            <dd>{selected.phone ? <a href={`tel:${selected.phone}`}>{selected.phone}</a> : '—'}</dd>
            <dt>Location</dt>
            <dd>{selected.location || '—'}</dd>
          </dl>
        </aside>
      )}
    </div>
    </div>
  )
}
