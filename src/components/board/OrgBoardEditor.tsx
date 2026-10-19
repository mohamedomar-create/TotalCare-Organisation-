import { useMemo, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { Copy, GripVertical, LayoutGrid, Minus, Plus, Redo2, RotateCcw, Search, Trash2, Undo2, X } from 'lucide-react'
import {
  CATALOGUE,
  DEPT_COLORS,
  LAYERS,
  TOP,
  emptyBoard,
  headcount,
  managerOf,
  roleFromCatalogue,
  suggestedBoard,
  type BoardDept,
  type BoardRole,
  type CatalogueRole,
  type OrgBoard,
} from '../../lib/orgBoard'

type Selection = { kind: 'role' | 'dept'; id: string } | null

const TOP_COLOR = '#1B2A3A'

function colorOf(board: OrgBoard, dept: string) {
  return dept === TOP ? TOP_COLOR : board.depts.find((d) => d.id === dept)?.color ?? '#5C6773'
}

/* ---------- cards ---------- */

function CardBody({ role, color, compact }: { role: Pick<BoardRole, 'en' | 'ar' | 'count' | 'layer' | 'dept'>; color: string; compact?: boolean }) {
  const filled = role.layer <= 1
  return (
    <div
      className={`ob-card ${filled ? 'filled' : ''} ${compact ? 'compact' : ''}`}
      style={{ '--c': color } as React.CSSProperties}
    >
      <div className="ob-card-text">
        <span className="ob-en">{role.en || 'New role'}</span>
        {role.ar && <span className="ob-ar" lang="ar">{role.ar}</span>}
      </div>
      {role.count > 1 && <span className="ob-count" title={`${role.count} people`}>×{role.count}</span>}
    </div>
  )
}

function DraggableRole({ role, color, selected, onSelect }: { role: BoardRole; color: string; selected: boolean; onSelect: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `role|${role.id}` })
  return (
    <div
      ref={setNodeRef}
      className={`ob-drag ${selected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      onClick={onSelect}
      {...listeners}
      {...attributes}
      aria-label={`${role.en}, press space to move`}
    >
      <GripVertical size={13} className="ob-grip" />
      <CardBody role={role} color={color} />
    </div>
  )
}

function LibraryItem({ item, color, onAdd }: { item: CatalogueRole; color: string; onAdd: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `lib|${item.key}` })
  return (
    <div ref={setNodeRef} className={`ob-lib-item ${isDragging ? 'dragging' : ''}`} {...listeners} {...attributes} style={{ '--c': color } as React.CSSProperties}>
      <div className="ob-card-text">
        <span className="ob-en">{item.en}</span>
        <span className="ob-ar" lang="ar">{item.ar}</span>
      </div>
      <button type="button" className="ob-lib-add" onPointerDown={(e) => e.stopPropagation()} onClick={onAdd} aria-label={`Add ${item.en}`} title="Add to the board">
        <Plus size={14} />
      </button>
    </div>
  )
}

function Cell({ id, span, children, onAdd, readOnly }: { id: string; span?: boolean; children: React.ReactNode; onAdd?: () => void; readOnly?: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: readOnly })
  return (
    <div ref={setNodeRef} className={`ob-cell ${span ? 'span' : ''} ${isOver ? 'over' : ''}`}>
      {children}
      {!readOnly && onAdd && (
        <button type="button" className="ob-cell-add" onClick={onAdd} title="Add an empty role here">
          <Plus size={13} />
        </button>
      )}
    </div>
  )
}

function Trash({ active, children }: { active: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'trash' })
  return (
    <div ref={setNodeRef} className={`ob-library ${active ? 'trash-active' : ''} ${isOver ? 'trash-over' : ''}`}>
      {active && (
        <div className="ob-trash-msg">
          <Trash2 size={22} />
          <span>Drop here to remove</span>
        </div>
      )}
      {children}
    </div>
  )
}

/* ---------- grid ---------- */

function Grid({ board, readOnly, selection, onSelect, onAddEmpty }: {
  board: OrgBoard
  readOnly?: boolean
  selection?: Selection
  onSelect?: (s: Selection) => void
  onAddEmpty?: (layer: number, dept: string) => void
}) {
  const cols = board.depts.length
  const rolesIn = (layer: number, dept: string) => board.roles.filter((r) => r.layer === layer && r.dept === dept)

  const renderRoles = (layer: number, dept: string) =>
    rolesIn(layer, dept).map((r) =>
      readOnly ? (
        <CardBody key={r.id} role={r} color={colorOf(board, r.dept)} compact />
      ) : (
        <DraggableRole
          key={r.id}
          role={r}
          color={colorOf(board, r.dept)}
          selected={selection?.kind === 'role' && selection.id === r.id}
          onSelect={() => onSelect?.({ kind: 'role', id: r.id })}
        />
      ),
    )

  return (
    <div className="ob-grid" style={{ gridTemplateColumns: `86px repeat(${cols}, minmax(${readOnly ? 110 : 132}px, 1fr))` }}>
      <div />
      {board.depts.map((d) => (
        <button
          key={d.id}
          type="button"
          className={`ob-dept ${selection?.kind === 'dept' && selection.id === d.id ? 'selected' : ''}`}
          style={{ '--c': d.color } as React.CSSProperties}
          onClick={() => onSelect?.({ kind: 'dept', id: d.id })}
          disabled={readOnly}
          title={readOnly ? undefined : 'Click to rename or recolour'}
        >
          <span className="ob-en">{d.en}</span>
          <span className="ob-ar" lang="ar">{d.ar}</span>
        </button>
      ))}

      {LAYERS.map((layer, i) => (
        <div key={i} className="ob-row" style={{ display: 'contents' }}>
          <div className={`ob-rib l${i}`}>
            <span>{layer.en}</span>
            <small lang="ar">{layer.ar}</small>
          </div>
          {i === 0 ? (
            <Cell id={`cell|0|${TOP}`} span readOnly={readOnly} onAdd={() => onAddEmpty?.(0, TOP)}>
              {renderRoles(0, TOP)}
            </Cell>
          ) : (
            board.depts.map((d) => (
              <Cell key={d.id} id={`cell|${i}|${d.id}`} readOnly={readOnly} onAdd={() => onAddEmpty?.(i, d.id)}>
                {renderRoles(i, d.id)}
              </Cell>
            ))
          )}
        </div>
      ))}
    </div>
  )
}

/* ---------- read-only view ---------- */

export function OrgBoardView({ board }: { board: OrgBoard }) {
  return (
    <div className="ob ob-readonly">
      <div className="ob-stats muted small">
        {board.roles.length} roles · {headcount(board)} people · {board.depts.length} departments
      </div>
      <div className="ob-scroll">
        <Grid board={board} readOnly />
      </div>
    </div>
  )
}

/* ---------- editor ---------- */

interface Props {
  value: OrgBoard
  onChange: (next: OrgBoard) => void
}

// `value` is read on mount only; remount (with a `key`) to load a different board.
export default function OrgBoardEditor({ value, onChange }: Props) {
  const [board, setBoard] = useState<OrgBoard>(value)
  const [selection, setSelection] = useState<Selection>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [libDept, setLibDept] = useState<string>('all')
  const past = useRef<OrgBoard[]>([])
  const future = useRef<OrgBoard[]>([])
  const [, tick] = useState(0)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  )

  function commit(next: OrgBoard, record = true) {
    if (record) {
      past.current = [...past.current.slice(-49), board]
      future.current = []
      tick((t) => t + 1)
    }
    setBoard(next)
    onChange(next)
  }

  // Save an undo point before a run of typing, without changing anything.
  function record() {
    past.current = [...past.current.slice(-49), board]
    future.current = []
    tick((t) => t + 1)
  }

  function undo() {
    const prev = past.current.pop()
    if (!prev) return
    future.current.push(board)
    setBoard(prev)
    onChange(prev)
    tick((t) => t + 1)
  }

  function redo() {
    const next = future.current.pop()
    if (!next) return
    past.current.push(board)
    setBoard(next)
    onChange(next)
    tick((t) => t + 1)
  }

  const updateRole = (id: string, patch: Partial<BoardRole>, record = true) =>
    commit({ ...board, roles: board.roles.map((r) => (r.id === id ? { ...r, ...patch } : r)) }, record)

  const updateDept = (id: string, patch: Partial<BoardDept>, record = true) =>
    commit({ ...board, depts: board.depts.map((d) => (d.id === id ? { ...d, ...patch } : d)) }, record)

  function addFromLibrary(item: CatalogueRole, layer?: number, dept?: string) {
    let target = dept ?? item.dept
    if (target !== TOP && !board.depts.some((d) => d.id === target)) target = board.depts[0]?.id ?? TOP
    const role = roleFromCatalogue(item, target, target === TOP ? 0 : Math.max(1, layer ?? item.layer))
    commit({ ...board, roles: [...board.roles, role] })
    setSelection({ kind: 'role', id: role.id })
  }

  function addEmpty(layer: number, dept: string) {
    const role: BoardRole = { id: crypto.randomUUID(), en: 'New role', ar: '', dept, layer, count: 1, duties: '' }
    commit({ ...board, roles: [...board.roles, role] })
    setSelection({ kind: 'role', id: role.id })
  }

  function removeRole(id: string) {
    commit({
      ...board,
      roles: board.roles.filter((r) => r.id !== id).map((r) => (r.reportsTo === id ? { ...r, reportsTo: null } : r)),
    })
    if (selection?.id === id) setSelection(null)
  }

  function addDept() {
    const id = crypto.randomUUID().slice(0, 8)
    const color = DEPT_COLORS[board.depts.length % DEPT_COLORS.length]
    commit({ ...board, depts: [...board.depts, { id, en: 'New department', ar: '', color }] })
    setSelection({ kind: 'dept', id })
  }

  function removeDept(id: string) {
    const n = board.roles.filter((r) => r.dept === id).length
    if (n && !confirm(`Remove this department and its ${n} role(s)?`)) return
    commit({ depts: board.depts.filter((d) => d.id !== id), roles: board.roles.filter((r) => r.dept !== id) })
    setSelection(null)
  }

  function restart(kind: 'suggested' | 'empty') {
    if (board.roles.length && !confirm(kind === 'empty' ? 'Clear the whole board?' : 'Replace your board with the suggested TotalCare structure?')) return
    commit(kind === 'empty' ? emptyBoard() : suggestedBoard())
    setSelection(null)
  }

  function onDragStart(e: DragStartEvent) {
    setDragId(String(e.active.id))
  }

  function onDragEnd(e: DragEndEvent) {
    setDragId(null)
    const over = e.over ? String(e.over.id) : null
    const [kind, ref] = String(e.active.id).split('|')
    if (!over) return
    if (over === 'trash') {
      if (kind === 'role') removeRole(ref)
      return
    }
    const [, layerStr, dept] = over.split('|')
    const layer = Number(layerStr)
    if (kind === 'lib') {
      const item = CATALOGUE.find((c) => c.key === ref)
      if (item) addFromLibrary(item, layer, dept)
    } else if (kind === 'role') {
      const role = board.roles.find((r) => r.id === ref)
      if (!role || (role.layer === layer && role.dept === dept)) return
      // Move to the end of the target cell.
      commit({ ...board, roles: [...board.roles.filter((r) => r.id !== ref), { ...role, layer, dept }] })
    }
  }

  const libraryItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    return CATALOGUE.filter((c) => (libDept === 'all' || c.dept === libDept) && (!q || c.en.toLowerCase().includes(q) || c.ar.includes(q)))
  }, [query, libDept])

  const selectedRole = selection?.kind === 'role' ? board.roles.find((r) => r.id === selection.id) : undefined
  const selectedDept = selection?.kind === 'dept' ? board.depts.find((d) => d.id === selection.id) : undefined
  const draggingRole = dragId?.startsWith('role|') ? board.roles.find((r) => r.id === dragId.slice(5)) : undefined
  const draggingLib = dragId?.startsWith('lib|') ? CATALOGUE.find((c) => c.key === dragId.slice(4)) : undefined

  if (board.roles.length === 0 && past.current.length === 0) {
    return (
      <div className="ob ob-start">
        <LayoutGrid size={36} />
        <h3>How should TotalCare Egypt be organised?</h3>
        <p className="muted">Start from the suggested structure and move boxes around, or start with an empty board.</p>
        <div className="row center">
          <button type="button" className="big" onClick={() => commit(suggestedBoard())}>Start from suggested structure</button>
          <button type="button" className="secondary big" onClick={() => commit({ ...emptyBoard(), roles: [] }, true)}>Start empty</button>
        </div>
        <p className="muted small" lang="ar">ابدأ بالهيكل المقترح وحرّك المربعات، أو ابدأ بلوحة فارغة.</p>
      </div>
    )
  }

  const managerOptions = selectedRole
    ? board.roles.filter((r) => r.id !== selectedRole.id && r.layer < selectedRole.layer)
    : []
  const defaultManager = selectedRole ? managerOf(board, { ...selectedRole, reportsTo: null }) : undefined

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragId(null)}>
      <div className="ob">
        <div className="ob-toolbar">
          <div className="tool-group">
            <button type="button" className="tool" onClick={undo} disabled={past.current.length === 0} title="Undo"><Undo2 size={15} /> Undo</button>
            <button type="button" className="tool" onClick={redo} disabled={future.current.length === 0} title="Redo"><Redo2 size={15} /></button>
            <button type="button" className="tool" onClick={addDept}><Plus size={15} /> Department</button>
            <button type="button" className="tool" onClick={() => restart('suggested')}><RotateCcw size={15} /> Suggested</button>
            <button type="button" className="tool danger" onClick={() => restart('empty')}><Trash2 size={15} /> Clear</button>
          </div>
          <div className="ob-stats">
            <span><b>{board.roles.length}</b> roles</span>
            <span><b>{headcount(board)}</b> people</span>
            <span><b>{board.depts.length}</b> departments</span>
          </div>
        </div>

        <div className="ob-body">
          <Trash active={Boolean(draggingRole)}>
            <p className="palette-title">Ready-made roles</p>
            <div className="search small-search">
              <Search size={14} />
              <input placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <select className="ob-lib-filter" value={libDept} onChange={(e) => setLibDept(e.target.value)} aria-label="Filter roles by department">
              <option value="all">All departments</option>
              <option value={TOP}>Management</option>
              {board.depts.map((d) => <option key={d.id} value={d.id}>{d.en}</option>)}
            </select>
            <div className="ob-lib-list">
              {libraryItems.map((item) => (
                <LibraryItem key={item.key} item={item} color={colorOf(board, item.dept)} onAdd={() => addFromLibrary(item)} />
              ))}
              {libraryItems.length === 0 && <p className="muted small">No match. Use + in any box to add your own role.</p>}
            </div>
            <p className="muted small ob-tip">Drag a role onto the board, or tap <b>+</b> to add it to its usual place.</p>
          </Trash>

          <div className="ob-scroll">
            <Grid board={board} selection={selection} onSelect={setSelection} onAddEmpty={addEmpty} />
          </div>

          {(selectedRole || selectedDept) && (
            <aside className="ob-panel">
              <div className="row between">
                <strong>{selectedRole ? 'Role' : 'Department'}</strong>
                <button type="button" className="icon-btn" onClick={() => setSelection(null)} aria-label="Close"><X size={18} /></button>
              </div>

              {selectedRole && (
                <>
                  <label>Job title<input value={selectedRole.en} onFocus={record} onChange={(e) => updateRole(selectedRole.id, { en: e.target.value }, false)} /></label>
                  <label>المسمى الوظيفي<input lang="ar" dir="rtl" value={selectedRole.ar} onFocus={record} onChange={(e) => updateRole(selectedRole.id, { ar: e.target.value }, false)} /></label>
                  <p className="field-label">How many people?</p>
                  <div className="stepper-input">
                    <button type="button" className="secondary" onClick={() => updateRole(selectedRole.id, { count: Math.max(0, selectedRole.count - 1) })} aria-label="Fewer"><Minus size={15} /></button>
                    <span>{selectedRole.count}</span>
                    <button type="button" className="secondary" onClick={() => updateRole(selectedRole.id, { count: selectedRole.count + 1 })} aria-label="More"><Plus size={15} /></button>
                  </div>
                  <label>
                    Reports to
                    <select value={selectedRole.reportsTo ?? ''} onChange={(e) => updateRole(selectedRole.id, { reportsTo: e.target.value || null })}>
                      <option value="">Automatic{defaultManager ? ` (${defaultManager.en})` : ''}</option>
                      {managerOptions.map((r) => <option key={r.id} value={r.id}>{r.en}</option>)}
                    </select>
                  </label>
                  <label>
                    Main duties <span className="muted">(one per line)</span>
                    <textarea rows={5} dir="auto" value={selectedRole.duties} onFocus={record} onChange={(e) => updateRole(selectedRole.id, { duties: e.target.value }, false)} />
                  </label>
                  <div className="row">
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => {
                        const copy = { ...selectedRole, id: crypto.randomUUID(), reportsTo: selectedRole.reportsTo ?? null }
                        commit({ ...board, roles: [...board.roles, copy] })
                        setSelection({ kind: 'role', id: copy.id })
                      }}
                    >
                      <Copy size={15} /> Duplicate
                    </button>
                    <button type="button" className="danger" onClick={() => removeRole(selectedRole.id)}><Trash2 size={15} /> Remove</button>
                  </div>
                </>
              )}

              {selectedDept && (
                <>
                  <label>Name<input value={selectedDept.en} onFocus={record} onChange={(e) => updateDept(selectedDept.id, { en: e.target.value }, false)} /></label>
                  <label>الاسم بالعربي<input lang="ar" dir="rtl" value={selectedDept.ar} onFocus={record} onChange={(e) => updateDept(selectedDept.id, { ar: e.target.value }, false)} /></label>
                  <p className="field-label">Colour</p>
                  <div className="swatches">
                    {DEPT_COLORS.map((c) => (
                      <button key={c} type="button" className={`swatch-btn ${selectedDept.color === c ? 'active' : ''}`} style={{ background: c }} onClick={() => updateDept(selectedDept.id, { color: c })} aria-label={`Colour ${c}`} />
                    ))}
                  </div>
                  <div className="row">
                    <button type="button" className="danger" onClick={() => removeDept(selectedDept.id)}><Trash2 size={15} /> Remove department</button>
                  </div>
                </>
              )}
            </aside>
          )}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {draggingRole && <div className="ob-overlay"><CardBody role={draggingRole} color={colorOf(board, draggingRole.dept)} /></div>}
        {draggingLib && <div className="ob-overlay"><CardBody role={{ ...draggingLib, count: draggingLib.suggested ?? 1 }} color={colorOf(board, draggingLib.dept)} /></div>}
      </DragOverlay>
    </DndContext>
  )
}
