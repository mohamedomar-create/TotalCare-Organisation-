import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { Download, Kanban, Plus, Table2 } from 'lucide-react'
import { useApp } from './useApp'
import { Icon } from '../components/Icon'
import { can, displayValue, list, moveStage, money, recordTitle } from '../lib/engine'
import type { FieldDef, ModuleDef } from '../lib/schema'
import { moduleById } from '../lib/schema'
import type { Rec, Workspace } from '../lib/types'
import type { AppSchema } from '../lib/schema'

const STATUS_PILL: Record<string, string> = { draft: 'gray', posted: '', partial: 'amber', paid: 'green', void: 'red', sent: '', accepted: 'green', declined: 'red', invoiced: 'green' }

export default function ModuleView() {
  const { moduleId } = useParams()
  const { ws, user, schema } = useApp()
  const mod = moduleById(schema, moduleId ?? '')
  if (!mod) return <div className="page">This module no longer exists.</div>
  if (!can({ schema, user }, mod.id, 'view')) return <div className="page">Your role can’t see {mod.name}.</div>
  return <View key={mod.id} mod={mod} ws={ws} schema={schema} />
}

function View({ mod, ws, schema }: { mod: ModuleDef; ws: Workspace; schema: AppSchema }) {
  const nav = useNavigate()
  const { user, act } = useApp()
  const [view, setView] = useState<'table' | 'board'>(mod.stages ? 'board' : 'table')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: '__created', dir: -1 })
  const [stage, setStage] = useState('')
  const cols = mod.fields.filter((f) => f.inList).slice(0, 7)
  const all = list(ws, mod.id)
  const rows = all
    .filter((r) => !q || recordTitle(ws, schema, r).toLowerCase().includes(q.toLowerCase()) || cols.some((c) => displayValue(ws, schema, c, r.values[c.key]).toLowerCase().includes(q.toLowerCase())))
    .filter((r) => !stage || r.stage === stage || r.status === stage)
    .sort((a, b) => {
      const av = sort.key === '__created' ? a.createdAt : (a.values[sort.key] as string | number | undefined) ?? ''
      const bv = sort.key === '__created' ? b.createdAt : (b.values[sort.key] as string | number | undefined) ?? ''
      return (av > bv ? 1 : av < bv ? -1 : 0) * sort.dir
    })

  function exportCsv() {
    const header = ['Title', ...(mod.stages ? ['Stage'] : []), ...(mod.lines ? ['Status'] : []), ...mod.fields.map((f) => f.label)]
    const lines = rows.map((r) => [recordTitle(ws, schema, r), ...(mod.stages ? [mod.stages.find((s) => s.id === r.stage)?.name ?? ''] : []), ...(mod.lines ? [r.status ?? ''] : []), ...mod.fields.map((f) => f.type === 'currency' || f.type === 'number' ? String(r.values[f.key] ?? '') : displayValue(ws, schema, f, r.values[f.key]))])
    const csv = [header, ...lines].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${mod.name}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1><span className="badge" style={{ background: mod.color }}><Icon name={mod.icon} size={20} /></span>{mod.name} <span className="pill gray">{all.length}</span></h1>
        <div className="row">
          {mod.stages && (
            <div className="seg">
              <button className={view === 'board' ? 'on' : ''} onClick={() => setView('board')}><Kanban size={15} /> Board</button>
              <button className={view === 'table' ? 'on' : ''} onClick={() => setView('table')}><Table2 size={15} /> Table</button>
            </div>
          )}
          <button className="secondary" onClick={exportCsv}><Download size={15} /> Export</button>
          {can({ schema, user }, mod.id, 'create') && <button onClick={() => nav(`/app/new/${mod.id}`)}><Plus size={16} /> New {mod.singular.toLowerCase()}</button>}
        </div>
      </div>
      <div className="row" style={{ marginBottom: 12 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${mod.name.toLowerCase()}…`} style={{ maxWidth: 320 }} />
        {(mod.stages || mod.lines) && (
          <select value={stage} onChange={(e) => setStage(e.target.value)} style={{ width: 'auto' }}>
            <option value="">{mod.stages ? 'All stages' : 'All statuses'}</option>
            {mod.stages?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            {mod.lines && (mod.role === 'quotes' ? ['draft', 'sent', 'accepted', 'declined', 'invoiced'] : ['draft', 'posted', 'partial', 'paid', 'void']).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      {all.length === 0 ? (
        <div className="card empty">
          <div className="big-ic" style={{ background: mod.color }}><Icon name={mod.icon} size={32} /></div>
          <b>No {mod.name.toLowerCase()} yet</b>
          <p className="small">Create the first one to get started.</p>
          {can({ schema, user }, mod.id, 'create') && <Link className="btn" to={`/app/new/${mod.id}`}><Plus size={16} /> New {mod.singular.toLowerCase()}</Link>}
        </div>
      ) : view === 'board' && mod.stages ? (
        <Board mod={mod} rows={rows} ws={ws} schema={schema} onMove={(id, st) => act((ctx) => moveStage(ctx, list(ctx.ws, mod.id).find((r) => r.id === id)!, st))} />
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th onClick={() => setSort({ key: mod.titleField, dir: sort.dir === 1 ? -1 : 1 })}>{mod.lines ? 'Number' : mod.fields.find((f) => f.key === mod.titleField)?.label}</th>
                {mod.stages && <th>Stage</th>}
                {mod.lines && <th>Status</th>}
                {cols.filter((c) => c.key !== mod.titleField).map((c) => (
                  <th key={c.id} className={isNum(c) ? 'num' : ''} onClick={() => setSort({ key: c.key, dir: sort.key === c.key && sort.dir === 1 ? -1 : 1 })}>{c.label}{sort.key === c.key ? (sort.dir === 1 ? ' ↑' : ' ↓') : ''}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} onClick={() => nav(`/app/r/${r.id}`)}>
                  <td><b>{mod.lines ? (r.number ?? 'Draft') : recordTitle(ws, schema, r)}</b></td>
                  {mod.stages && <td>{(() => { const s = mod.stages.find((x) => x.id === r.stage); return s ? <span className="pill" style={{ background: s.color + '22', color: s.color }}>{s.name}</span> : null })()}</td>}
                  {mod.lines && <td><span className={`pill ${STATUS_PILL[r.status ?? 'draft']}`}>{r.status}</span></td>}
                  {cols.filter((c) => c.key !== mod.titleField).map((c) => <td key={c.id} className={isNum(c) ? 'num' : ''}><Cell field={c} rec={r} ws={ws} schema={schema} /></td>)}
                </tr>
              ))}
            </tbody>
            {cols.some((c) => c.type === 'currency') && (
              <tfoot>
                <tr>
                  <td>Total ({rows.length})</td>
                  {mod.stages && <td />}
                  {mod.lines && <td />}
                  {cols.filter((c) => c.key !== mod.titleField).map((c) => <td key={c.id} className="num">{c.type === 'currency' ? money(rows.filter((r) => r.status !== 'void').reduce((s, r) => s + Number(r.values[c.key] ?? 0), 0), schema.company.currency) : ''}</td>)}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  )
}

const isNum = (f: FieldDef) => ['number', 'currency', 'percent', 'formula'].includes(f.type)

function Cell({ field, rec, ws, schema }: { field: FieldDef; rec: Rec; ws: Workspace; schema: AppSchema }) {
  const v = rec.values[field.key]
  if (field.type === 'select') {
    const o = field.options?.find((x) => x.value === v)
    return o ? <span className="pill" style={{ background: o.color + '22', color: o.color }}>{o.label}</span> : null
  }
  if (field.type === 'formula') return <>{v === undefined ? '' : Number(v).toLocaleString()}</>
  return <>{displayValue(ws, schema, field, v)}</>
}

function Board({ mod, rows, ws, schema, onMove }: { mod: ModuleDef; rows: Rec[]; ws: Workspace; schema: AppSchema; onMove: (id: string, stage: string) => void }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const amountField = mod.fields.find((f) => f.type === 'currency')
  function onDragEnd(e: DragEndEvent) {
    if (e.over && e.active.data.current?.stage !== e.over.id) onMove(String(e.active.id), String(e.over.id))
  }
  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="kanban">
        {mod.stages!.map((s) => {
          const items = rows.filter((r) => r.stage === s.id)
          const sum = amountField ? items.reduce((t, r) => t + Number(r.values[amountField.key] ?? 0), 0) : 0
          return (
            <Column key={s.id} id={s.id}>
              <div className="kcol-head"><span className="dot" style={{ background: s.color }} />{s.name} <span className="pill gray tiny">{items.length}</span><span className="sum">{amountField ? money(sum, schema.company.currency).replace('.00', '') : `${s.probability}%`}</span></div>
              {items.map((r) => <Card key={r.id} rec={r} color={s.color} mod={mod} ws={ws} schema={schema} amountField={amountField} />)}
            </Column>
          )
        })}
      </div>
    </DndContext>
  )
}

function Column({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return <div ref={setNodeRef} className={`kcol ${isOver ? 'over' : ''}`}>{children}</div>
}

function Card({ rec, color, mod, ws, schema, amountField }: { rec: Rec; color: string; mod: ModuleDef; ws: Workspace; schema: AppSchema; amountField?: FieldDef }) {
  const nav = useNavigate()
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: rec.id, data: { stage: rec.stage } })
  const owner = mod.fields.find((f) => f.type === 'user')
  const rel = mod.fields.find((f) => f.type === 'relation')
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={`kcard ${isDragging ? 'dragging' : ''}`} style={{ ['--c' as string]: color, transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined }} onClick={() => nav(`/app/r/${rec.id}`)}>
      <b>{recordTitle(ws, schema, rec)}</b>
      {rel && <div className="tiny muted">{displayValue(ws, schema, rel, rec.values[rel.key])}</div>}
      <div className="meta">
        <span>{amountField ? displayValue(ws, schema, amountField, rec.values[amountField.key]) : ''}</span>
        <span>{owner ? displayValue(ws, schema, owner, rec.values[owner.key]) : ''}</span>
      </div>
    </div>
  )
}
