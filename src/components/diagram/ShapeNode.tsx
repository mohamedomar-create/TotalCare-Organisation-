import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Handle, NodeResizer, Position, useReactFlow, type Node, type NodeProps } from '@xyflow/react'
import type { ShapeKind } from '../../lib/types'
import { SHAPE_BY_KIND, initials } from './shapes'

export type ShapeData = {
  label: string
  responsibilities: string
  kind: ShapeKind
  color: string
}

export type ShapeFlowNode = Node<ShapeData, 'shape'>

export const DiagramContext = createContext<{ readOnly: boolean; record: () => void }>({
  readOnly: true,
  record: () => {},
})

function EditableText({ id, value, field, className, multiline }: {
  id: string
  value: string
  field: 'label' | 'responsibilities'
  className?: string
  multiline?: boolean
}) {
  const { readOnly, record } = useContext(DiagramContext)
  const { updateNodeData } = useReactFlow()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      ref.current?.focus()
      ref.current?.select()
    }
  }, [editing])

  function commit() {
    setEditing(false)
    if (draft !== value) {
      record()
      updateNodeData(id, { [field]: draft })
    }
  }

  if (editing) {
    const props = {
      ref,
      className: `nodrag inline-edit ${className ?? ''}`,
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (!multiline || e.metaKey || e.ctrlKey)) commit()
        if (e.key === 'Escape') {
          setDraft(value)
          setEditing(false)
        }
      },
    }
    return multiline ? <textarea rows={3} {...props} /> : <input {...props} />
  }
  return (
    <span
      className={className}
      title={readOnly ? undefined : 'Double-click to edit'}
      onDoubleClick={(e) => {
        if (readOnly) return
        e.stopPropagation()
        setDraft(value)
        setEditing(true)
      }}
    >
      {value || (readOnly ? '' : <em className="placeholder">{field === 'label' ? 'Untitled' : 'Double-click to add details'}</em>)}
    </span>
  )
}

const sides = [
  { pos: Position.Top, id: 't' },
  { pos: Position.Right, id: 'r' },
  { pos: Position.Bottom, id: 'b' },
  { pos: Position.Left, id: 'l' },
]

export default function ShapeNode({ id, data, selected }: NodeProps<ShapeFlowNode>) {
  const { readOnly, record } = useContext(DiagramContext)
  const { kind, color, label, responsibilities } = data
  const Icon = SHAPE_BY_KIND[kind]?.icon
  const resizable = !readOnly && (kind === 'note' || kind === 'zone')

  const handles =
    kind === 'zone' ? null : sides.map((s) => <Handle key={s.id} id={s.id} type="source" position={s.pos} className="shape-handle" />)

  let body: React.ReactNode
  switch (kind) {
    case 'person':
      body = (
        <div className="shape-person">
          <div className="avatar" style={{ background: color }}>{initials(label)}</div>
          <EditableText id={id} value={label} field="label" className="shape-title" />
          <EditableText id={id} value={responsibilities} field="responsibilities" className="shape-sub" multiline />
        </div>
      )
      break
    case 'note':
      body = (
        <div className="shape-note" style={{ background: color }}>
          <EditableText id={id} value={label} field="label" className="shape-note-text" multiline />
        </div>
      )
      break
    case 'zone':
      body = (
        <div className="shape-zone" style={{ borderColor: color, background: `${color}14` }}>
          <EditableText id={id} value={label} field="label" className="shape-zone-title" />
        </div>
      )
      break
    case 'department':
      body = (
        <div className="shape-card shape-department">
          <div className="shape-header" style={{ background: color }}>
            {Icon && <Icon size={14} />}
            <EditableText id={id} value={label} field="label" className="shape-title" />
          </div>
          <EditableText id={id} value={responsibilities} field="responsibilities" className="shape-sub" multiline />
        </div>
      )
      break
    case 'leader':
      body = (
        <div className="shape-card shape-leader" style={{ background: color }}>
          <div className="shape-row">
            {Icon && <Icon size={16} />}
            <EditableText id={id} value={label} field="label" className="shape-title" />
          </div>
          <EditableText id={id} value={responsibilities} field="responsibilities" className="shape-sub" multiline />
        </div>
      )
      break
    default:
      body = (
        <div className={`shape-card shape-${kind}`} style={{ borderColor: color }}>
          <div className="shape-row">
            {Icon && <Icon size={14} color={color} />}
            <EditableText id={id} value={label} field="label" className="shape-title" />
          </div>
          <EditableText id={id} value={responsibilities} field="responsibilities" className="shape-sub" multiline />
        </div>
      )
  }

  return (
    <div className={`shape ${selected ? 'is-selected' : ''} kind-${kind}`}>
      {resizable && (
        <NodeResizer isVisible={selected} minWidth={120} minHeight={80} onResizeStart={record} lineClassName="resize-line" handleClassName="resize-handle" />
      )}
      {handles}
      {body}
    </div>
  )
}
