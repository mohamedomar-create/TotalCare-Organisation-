import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react'
import {
  ArrowDownToLine,
  ArrowRightToLine,
  Copy,
  LayoutTemplate,
  Maximize,
  Network,
  Redo2,
  Trash2,
  Undo2,
} from 'lucide-react'
import type { Department, LinkKind, Person, ShapeKind, Structure } from '../../lib/types'
import ShapeNode, { DiagramContext, type ShapeData, type ShapeFlowNode } from './ShapeNode'
import { PALETTE_COLORS, SHAPES, SHAPE_BY_KIND } from './shapes'
import { templates } from './templates'
import { autoLayout } from './autoLayout'

type LinkEdge = Edge<{ kind: LinkKind }>
const nodeTypes = { shape: ShapeNode }
// Auto-fit never shrinks boxes below readable size; people can still zoom out by hand.
const FIT = { padding: 0.12, minZoom: 0.75, maxZoom: 1.1 }

function linkStyle(kind: LinkKind): Partial<LinkEdge> {
  return kind === 'collaborates'
    ? { type: 'smoothstep', animated: true, style: { strokeDasharray: '6 4', strokeWidth: 2, stroke: '#7c3aed' }, markerEnd: undefined }
    : { type: 'smoothstep', animated: false, style: { strokeWidth: 2, stroke: '#475569' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' } }
}

function toFlow(s: Structure): { nodes: ShapeFlowNode[]; edges: LinkEdge[] } {
  const nodes: ShapeFlowNode[] = s.nodes.map((n) => {
    const kind = n.kind ?? 'role'
    const def = SHAPE_BY_KIND[kind]
    const width = n.width ?? def.width
    const height = n.height ?? def.height
    return {
      id: n.id,
      type: 'shape',
      position: { x: n.x, y: n.y },
      data: { label: n.label, responsibilities: n.responsibilities ?? '', kind, color: n.color ?? def.color },
      ...(width && height ? { width, height } : {}),
      zIndex: kind === 'zone' ? -1 : 0,
    }
  })
  const edges: LinkEdge[] = s.edges.map((e) => {
    const kind = e.kind ?? 'reports'
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? 'b',
      targetHandle: e.targetHandle ?? 't',
      label: e.label,
      data: { kind },
      ...linkStyle(kind),
    }
  })
  return { nodes, edges }
}

function fromFlow(nodes: ShapeFlowNode[], edges: LinkEdge[]): Structure {
  return {
    nodes: nodes.map((n) => {
      const sized = n.data.kind === 'note' || n.data.kind === 'zone'
      return {
        id: n.id,
        label: n.data.label,
        responsibilities: n.data.responsibilities,
        kind: n.data.kind,
        color: n.data.color,
        x: Math.round(n.position.x),
        y: Math.round(n.position.y),
        ...(sized ? { width: Math.round(n.width ?? n.measured?.width ?? 180), height: Math.round(n.height ?? n.measured?.height ?? 140) } : {}),
      }
    }),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      kind: e.data?.kind ?? 'reports',
      label: typeof e.label === 'string' && e.label ? e.label : undefined,
      sourceHandle: e.sourceHandle ?? undefined,
      targetHandle: e.targetHandle ?? undefined,
    })),
  }
}

function makeNode(kind: ShapeKind, position: { x: number; y: number }, patch?: Partial<ShapeData>): ShapeFlowNode {
  const def = SHAPE_BY_KIND[kind]
  return {
    id: crypto.randomUUID(),
    type: 'shape',
    position,
    data: { label: def.defaultLabel, responsibilities: '', kind, color: def.color, ...patch },
    ...(def.width && def.height ? { width: def.width, height: def.height } : {}),
    zIndex: kind === 'zone' ? -1 : 0,
    selected: true,
  }
}

interface Props {
  value: Structure
  onChange?: (next: Structure) => void
  readOnly?: boolean
  height?: number | string
  people?: Person[]
  departments?: Department[]
}

type Snapshot = { nodes: ShapeFlowNode[]; edges: LinkEdge[] }

function Editor({ value, onChange, readOnly = false, height = 560, people = [], departments = [] }: Props) {
  const initial = useMemo(() => toFlow(value), []) // eslint-disable-line react-hooks/exhaustive-deps
  const [nodes, setNodes] = useState(initial.nodes)
  const [edges, setEdges] = useState(initial.edges)
  const [showTemplates, setShowTemplates] = useState(false)
  const past = useRef<Snapshot[]>([])
  const future = useRef<Snapshot[]>([])
  const [, setHistoryTick] = useState(0)
  const current = useRef<Snapshot>({ nodes, edges })
  current.current = { nodes, edges }
  const wrapper = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition, fitView } = useReactFlow()

  const commit = useCallback(
    (n: ShapeFlowNode[], e: LinkEdge[], emit = true) => {
      setNodes(n)
      setEdges(e)
      if (emit) onChange?.(fromFlow(n, e))
    },
    [onChange],
  )

  const record = useCallback(() => {
    past.current = [...past.current.slice(-49), current.current]
    future.current = []
    setHistoryTick((t) => t + 1)
  }, [])

  function undo() {
    const prev = past.current.pop()
    if (!prev) return
    future.current.push(current.current)
    commit(prev.nodes, prev.edges)
    setHistoryTick((t) => t + 1)
  }

  function redo() {
    const next = future.current.pop()
    if (!next) return
    past.current.push(current.current)
    commit(next.nodes, next.edges)
    setHistoryTick((t) => t + 1)
  }

  const selectedNodes = nodes.filter((n) => n.selected)
  const selectedNode = selectedNodes.length === 1 ? selectedNodes[0] : undefined
  const selectedEdge = !selectedNode ? edges.find((e) => e.selected) : undefined

  function onNodesChange(changes: NodeChange<ShapeFlowNode>[]) {
    if (changes.some((c) => c.type === 'remove')) record()
    const next = applyNodeChanges(changes, nodes)
    const emit = changes.some(
      (c) =>
        c.type === 'remove' ||
        c.type === 'add' ||
        c.type === 'replace' ||
        (c.type === 'position' && c.dragging === false) ||
        (c.type === 'dimensions' && c.resizing !== undefined),
    )
    commit(next, edges, emit)
  }

  function onEdgesChange(changes: EdgeChange<LinkEdge>[]) {
    if (changes.some((c) => c.type === 'remove')) record()
    commit(nodes, applyEdgeChanges(changes, edges), changes.some((c) => c.type !== 'select'))
  }

  function onConnect(c: Connection) {
    if (!c.source || !c.target || c.source === c.target) return
    record()
    const edge: LinkEdge = {
      id: crypto.randomUUID(),
      source: c.source,
      target: c.target,
      sourceHandle: c.sourceHandle,
      targetHandle: c.targetHandle,
      data: { kind: 'reports' },
      ...linkStyle('reports'),
    }
    commit(nodes, [...edges, edge])
  }

  function addShape(kind: ShapeKind, position?: { x: number; y: number }) {
    record()
    let pos = position
    if (!pos) {
      const rect = wrapper.current?.getBoundingClientRect()
      const center = rect ? screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }) : { x: 0, y: 0 }
      pos = { x: center.x - 100 + (nodes.length % 4) * 20, y: center.y - 40 + (nodes.length % 4) * 20 }
    }
    const node = makeNode(kind, pos)
    commit([...nodes.map((n) => ({ ...n, selected: false })), node], edges.map((e) => ({ ...e, selected: false })))
  }

  function addRelative(direction: 'below' | 'beside') {
    if (!selectedNode) return
    record()
    const kind: ShapeKind = selectedNode.data.kind === 'leader' ? 'department' : selectedNode.data.kind === 'department' ? 'role' : selectedNode.data.kind
    const offset = direction === 'below' ? { x: 0, y: 170 } : { x: 260, y: 0 }
    const node = makeNode(kind, { x: selectedNode.position.x + offset.x, y: selectedNode.position.y + offset.y }, { color: selectedNode.data.color })
    let newEdge: LinkEdge | undefined
    if (direction === 'below') {
      newEdge = { id: crypto.randomUUID(), source: selectedNode.id, target: node.id, sourceHandle: 'b', targetHandle: 't', data: { kind: 'reports' }, ...linkStyle('reports') }
    } else {
      const parentLink = edges.find((e) => e.target === selectedNode.id && e.data?.kind !== 'collaborates')
      if (parentLink) newEdge = { ...parentLink, id: crypto.randomUUID(), target: node.id, selected: false }
    }
    commit([...nodes.map((n) => ({ ...n, selected: false })), node], newEdge ? [...edges, newEdge] : edges)
  }

  function updateSelectedData(patch: Partial<ShapeData>) {
    if (!selectedNode) return
    commit(nodes.map((n) => (n.id === selectedNode.id ? { ...n, data: { ...n.data, ...patch } } : n)), edges)
  }

  function changeKind(kind: ShapeKind) {
    if (!selectedNode) return
    record()
    const def = SHAPE_BY_KIND[kind]
    commit(
      nodes.map((n) => {
        if (n.id !== selectedNode.id) return n
        const { width: _w, height: _h, ...rest } = n
        const sized = def.width && def.height ? { width: def.width, height: def.height } : {}
        return { ...rest, ...sized, zIndex: kind === 'zone' ? -1 : 0, data: { ...n.data, kind, color: def.color } }
      }),
      edges,
    )
  }

  function duplicateSelected() {
    if (selectedNodes.length === 0) return
    record()
    const copies = selectedNodes.map((n) => ({ ...n, id: crypto.randomUUID(), position: { x: n.position.x + 40, y: n.position.y + 40 }, selected: true }))
    commit([...nodes.map((n) => ({ ...n, selected: false })), ...copies], edges)
  }

  function deleteSelected() {
    const ids = new Set(selectedNodes.map((n) => n.id))
    if (ids.size === 0 && !selectedEdge) return
    record()
    commit(
      nodes.filter((n) => !ids.has(n.id)),
      edges.filter((e) => !e.selected && !ids.has(e.source) && !ids.has(e.target)),
    )
  }

  function updateSelectedEdge(patch: { kind?: LinkKind; label?: string }) {
    if (!selectedEdge) return
    commit(
      nodes,
      edges.map((e) => {
        if (e.id !== selectedEdge.id) return e
        const kind = patch.kind ?? e.data?.kind ?? 'reports'
        return { ...e, ...linkStyle(kind), label: patch.label ?? e.label, data: { kind } }
      }),
    )
  }

  function arrange() {
    record()
    const laid = autoLayout(fromFlow(nodes, edges))
    const pos = new Map(laid.nodes.map((n) => [n.id, { x: n.x, y: n.y }]))
    commit(
      nodes.map((n) => ({ ...n, position: pos.get(n.id) ?? n.position })),
      edges.map((e) => (e.data?.kind === 'collaborates' ? e : { ...e, sourceHandle: 'b', targetHandle: 't' })),
    )
    setTimeout(() => fitView({ ...FIT, duration: 300 }), 50)
  }

  function applyTemplate(make: () => Structure) {
    if (nodes.length > 0 && !confirm('Replace your current drawing with this template?')) return
    record()
    const flow = toFlow(make())
    commit(flow.nodes, flow.edges)
    setShowTemplates(false)
    setTimeout(() => fitView({ ...FIT, duration: 300 }), 50)
  }

  // Keyboard shortcuts (ignored while typing).
  useEffect(() => {
    if (readOnly) return
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select, [contenteditable]')) return
      if (!wrapper.current?.contains(t) && t !== document.body) return
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      else if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redo() }
      else if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateSelected() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const templateList = useMemo(() => templates(people, departments), [people, departments])
  const ctx = useMemo(() => ({ readOnly, record }), [readOnly, record])

  const canvas = (
    <div
      className="diagram-canvas"
      ref={wrapper}
      style={{ height }}
      onDragOver={(e) => {
        if (readOnly) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
      }}
      onDrop={(e) => {
        const kind = e.dataTransfer.getData('application/tc-shape') as ShapeKind
        if (readOnly || !kind) return
        e.preventDefault()
        const p = screenToFlowPosition({ x: e.clientX, y: e.clientY })
        addShape(kind, { x: p.x - 90, y: p.y - 30 })
      }}
    >
      <DiagramContext.Provider value={ctx}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStart={record}
          connectionMode={ConnectionMode.Loose}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          elementsSelectable={!readOnly}
          deleteKeyCode={readOnly ? null : ['Delete', 'Backspace']}
          snapToGrid
          snapGrid={[10, 10]}
          fitView
          fitViewOptions={readOnly ? { padding: 0.12, maxZoom: 1 } : FIT}
          minZoom={0.2}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </DiagramContext.Provider>

      {!readOnly && nodes.length === 0 && (
        <div className="diagram-empty">
          <h3>How would you organise TotalCare?</h3>
          <p>Pick a starting point — you can change everything afterwards.</p>
          <div className="template-grid">
            {templateList.filter((t) => t.key !== 'blank').map((t) => (
              <button key={t.key} type="button" className="template-card" onClick={() => applyTemplate(t.make)}>
                <strong>{t.name}</strong>
                <span>{t.description}</span>
              </button>
            ))}
          </div>
          <p className="muted small">…or drag shapes from the left onto the canvas.</p>
        </div>
      )}
    </div>
  )

  if (readOnly) return <div className="diagram readonly">{canvas}</div>

  return (
    <div className="diagram">
      <div className="diagram-toolbar">
        <div className="tool-group">
          <button type="button" className="tool" onClick={() => setShowTemplates((v) => !v)}><LayoutTemplate size={16} /> Templates</button>
          <button type="button" className="tool" onClick={arrange} title="Tidy up into a tree"><Network size={16} /> Auto-arrange</button>
          <button type="button" className="tool" onClick={() => fitView({ ...FIT, duration: 300 })} title="Fit to screen"><Maximize size={16} /></button>
        </div>
        <div className="tool-group">
          <button type="button" className="tool" onClick={undo} disabled={past.current.length === 0} title="Undo (Ctrl+Z)"><Undo2 size={16} /></button>
          <button type="button" className="tool" onClick={redo} disabled={future.current.length === 0} title="Redo (Ctrl+Y)"><Redo2 size={16} /></button>
          <button type="button" className="tool" onClick={duplicateSelected} disabled={selectedNodes.length === 0} title="Duplicate (Ctrl+D)"><Copy size={16} /></button>
          <button type="button" className="tool danger" onClick={deleteSelected} disabled={selectedNodes.length === 0 && !selectedEdge} title="Delete (Del)"><Trash2 size={16} /></button>
        </div>
      </div>

      {showTemplates && (
        <div className="template-popover">
          {templateList.map((t) => (
            <button key={t.key} type="button" className="template-card" onClick={() => applyTemplate(t.make)}>
              <strong>{t.name}</strong>
              <span>{t.description}</span>
            </button>
          ))}
        </div>
      )}

      <div className="diagram-body">
        <aside className="palette">
          <p className="palette-title">Shapes</p>
          {SHAPES.map((s) => (
            <button
              key={s.kind}
              type="button"
              className="palette-item"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/tc-shape', s.kind)
                e.dataTransfer.effectAllowed = 'move'
              }}
              onClick={() => addShape(s.kind)}
              title={`${s.hint} — click or drag onto the canvas`}
            >
              <span className="palette-icon" style={{ color: s.kind === 'note' ? '#a16207' : s.color }}><s.icon size={18} /></span>
              <span>{s.label}</span>
            </button>
          ))}
          <div className="palette-legend">
            <p className="palette-title">Lines</p>
            <span><i className="legend-solid" /> Reports to</span>
            <span><i className="legend-dashed" /> Works with</span>
          </div>
        </aside>

        {canvas}

        <aside className="inspector">
          {selectedNode ? (
            <>
              <p className="palette-title">Selected {SHAPE_BY_KIND[selectedNode.data.kind].label.toLowerCase()}</p>
              <label>
                Name
                <input value={selectedNode.data.label} onFocus={record} onChange={(e) => updateSelectedData({ label: e.target.value })} />
              </label>
              {selectedNode.data.kind !== 'note' && selectedNode.data.kind !== 'zone' && (
                <label>
                  {selectedNode.data.kind === 'person' ? 'Role / notes' : 'Responsibilities'}
                  <textarea rows={4} value={selectedNode.data.responsibilities} onFocus={record} onChange={(e) => updateSelectedData({ responsibilities: e.target.value })} />
                </label>
              )}
              <p className="field-label">Colour</p>
              <div className="swatches">
                {PALETTE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`swatch-btn ${selectedNode.data.color === c ? 'active' : ''}`}
                    style={{ background: c }}
                    onClick={() => { record(); updateSelectedData({ color: c }) }}
                    aria-label={`Colour ${c}`}
                  />
                ))}
              </div>
              <p className="field-label">Shape</p>
              <div className="kind-grid">
                {SHAPES.map((s) => (
                  <button key={s.kind} type="button" className={`kind-btn ${selectedNode.data.kind === s.kind ? 'active' : ''}`} onClick={() => changeKind(s.kind)} title={s.label}>
                    <s.icon size={15} />
                  </button>
                ))}
              </div>
              {selectedNode.data.kind !== 'note' && selectedNode.data.kind !== 'zone' && (
                <div className="quick-add">
                  <button type="button" className="secondary" onClick={() => addRelative('below')}><ArrowDownToLine size={15} /> Add box below</button>
                  <button type="button" className="secondary" onClick={() => addRelative('beside')}><ArrowRightToLine size={15} /> Add box beside</button>
                </div>
              )}
            </>
          ) : selectedEdge ? (
            <>
              <p className="palette-title">Selected line</p>
              <div className="segmented">
                <button type="button" className={selectedEdge.data?.kind !== 'collaborates' ? 'active' : ''} onClick={() => { record(); updateSelectedEdge({ kind: 'reports' }) }}>Reports to</button>
                <button type="button" className={selectedEdge.data?.kind === 'collaborates' ? 'active' : ''} onClick={() => { record(); updateSelectedEdge({ kind: 'collaborates' }) }}>Works with</button>
              </div>
              <label>
                Label (optional)
                <input value={typeof selectedEdge.label === 'string' ? selectedEdge.label : ''} onFocus={record} onChange={(e) => updateSelectedEdge({ label: e.target.value })} />
              </label>
            </>
          ) : (
            <div className="tips">
              <p className="palette-title">How to draw</p>
              <ol>
                <li><strong>Start</strong> with a template, or click / drag a shape.</li>
                <li><strong>Double-click</strong> any box to type in it.</li>
                <li><strong>Connect</strong>: drag from a dot on a box to another box.</li>
                <li><strong>Select</strong> a box for colours, shape and quick “add below”.</li>
                <li>Use <strong>Auto-arrange</strong> to tidy up.</li>
              </ol>
              <p className="muted small">Shortcuts: Ctrl+Z undo · Ctrl+Y redo · Ctrl+D duplicate · Del delete</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

// `value` is read on mount only; remount (e.g. with a `key`) to load a different structure.
export default function DiagramEditor(props: Props) {
  return (
    <ReactFlowProvider>
      <Editor {...props} />
    </ReactFlowProvider>
  )
}
