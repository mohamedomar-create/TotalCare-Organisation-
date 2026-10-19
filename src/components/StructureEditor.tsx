import { useState } from 'react'
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeProps,
} from '@xyflow/react'
import type { Structure } from '../lib/types'

type RoleNodeData = { label: string; responsibilities: string }

function RoleNode({ data, selected }: NodeProps<Node<RoleNodeData>>) {
  return (
    <div className={`role-node${selected ? ' selected' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <strong>{data.label || 'Untitled role'}</strong>
      {data.responsibilities && <p>{data.responsibilities}</p>}
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

const nodeTypes = { role: RoleNode }

function toFlow(structure: Structure) {
  const nodes: Node<RoleNodeData>[] = structure.nodes.map((n) => ({
    id: n.id,
    type: 'role',
    position: { x: n.x, y: n.y },
    data: { label: n.label, responsibilities: n.responsibilities },
  }))
  const edges: Edge[] = structure.edges.map((e) => ({ ...e, type: 'smoothstep' }))
  return { nodes, edges }
}

function fromFlow(nodes: Node<RoleNodeData>[], edges: Edge[]): Structure {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      label: n.data.label,
      responsibilities: n.data.responsibilities,
      x: Math.round(n.position.x),
      y: Math.round(n.position.y),
    })),
    edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
  }
}

interface Props {
  value: Structure
  onChange?: (next: Structure) => void
  readOnly?: boolean
  height?: number
}

// `value` is only read on mount; remount (e.g. with a `key`) to load a different structure.
export default function StructureEditor({ value, onChange, readOnly, height = 480 }: Props) {
  const [nodes, setNodes] = useState(() => toFlow(value).nodes)
  const [edges, setEdges] = useState(() => toFlow(value).edges)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = nodes.find((n) => n.id === selectedId)

  function update(nextNodes: Node<RoleNodeData>[], nextEdges: Edge[]) {
    setNodes(nextNodes)
    setEdges(nextEdges)
    onChange?.(fromFlow(nextNodes, nextEdges))
  }

  function addRole() {
    const id = crypto.randomUUID()
    const node: Node<RoleNodeData> = {
      id,
      type: 'role',
      position: { x: 40 + (nodes.length % 5) * 60, y: 40 + nodes.length * 30 },
      data: { label: 'New role', responsibilities: '' },
      selected: true,
    }
    update([...nodes.map((n) => ({ ...n, selected: false })), node], edges)
    setSelectedId(id)
  }

  function updateSelected(patch: Partial<RoleNodeData>) {
    update(nodes.map((n) => (n.id === selectedId ? { ...n, data: { ...n.data, ...patch } } : n)), edges)
  }

  function deleteSelected() {
    update(
      nodes.filter((n) => n.id !== selectedId),
      edges.filter((e) => e.source !== selectedId && e.target !== selectedId),
    )
    setSelectedId(null)
  }

  return (
    <div className="structure-editor">
      {!readOnly && (
        <div className="toolbar">
          <button type="button" onClick={addRole}>+ Add role / team</button>
          <span className="muted">
            Drag boxes to arrange. Drag from a box's bottom dot to another box to show who reports to whom.
            Select a line and press Delete to remove it.
          </span>
        </div>
      )}
      <div className="structure-body">
        <div className="chart" style={{ height }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            nodesDraggable={!readOnly}
            nodesConnectable={!readOnly}
            elementsSelectable={!readOnly}
            deleteKeyCode={readOnly ? null : ['Delete', 'Backspace']}
            onNodesChange={(changes: NodeChange<Node<RoleNodeData>>[]) => update(applyNodeChanges(changes, nodes), edges)}
            onEdgesChange={(changes: EdgeChange[]) => update(nodes, applyEdgeChanges(changes, edges))}
            onConnect={(c: Connection) => {
              if (!c.source || !c.target || c.source === c.target) return
              if (edges.some((e) => e.source === c.source && e.target === c.target)) return
              update(nodes, [...edges, { id: crypto.randomUUID(), source: c.source, target: c.target, type: 'smoothstep' }])
            }}
            onSelectionChange={({ nodes: sel }) => setSelectedId(sel.length === 1 ? sel[0].id : null)}
          >
            <Background />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
        {!readOnly && selected && (
          <div className="card side">
            <label>
              Role / team name
              <input value={selected.data.label} onChange={(e) => updateSelected({ label: e.target.value })} />
            </label>
            <label>
              Responsibilities
              <textarea
                rows={6}
                value={selected.data.responsibilities}
                onChange={(e) => updateSelected({ responsibilities: e.target.value })}
              />
            </label>
            <button type="button" className="danger" onClick={deleteSelected}>Delete box</button>
          </div>
        )}
      </div>
    </div>
  )
}
