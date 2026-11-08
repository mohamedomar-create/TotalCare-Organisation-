import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Crown, Gift } from 'lucide-react'
import { ARABIC, DEPT_IDEA_PICKS, DEPT_STRENGTH_PICKS, DEPT_WEAKNESS_PICKS, SURVEY_DEPARTMENTS, type DeptReview, type Nomination } from '../../lib/survey'
import { answered, deptGaps } from '../../lib/quality'

/** 1–10 score buttons, red to green. */
export function ScoreScale({ value, onChange, disabled }: { value?: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div className="score-scale" role="radiogroup" aria-label="Score from 1 to 10">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} disabled={disabled} className={`score-btn s${n} ${value === n ? 'on' : ''}`} onClick={() => onChange(n)}>
          {n}
        </button>
      ))}
      <div className="score-legend muted small"><span>1 = very weak · ضعيفة جداً</span><span>10 = excellent · ممتازة</span></div>
    </div>
  )
}

export function deptState(r?: DeptReview) {
  const gaps = deptGaps(r).length
  return gaps === 0 ? 'done' : gaps < 4 ? 'partial' : 'empty'
}

const Req = () => <span className="req" aria-label="required">*</span>


const OTHER = '__other__'

/**
 * A drop-down of ready answers with "Other — write it" at the end. Choosing Other shows a text box.
 * The stored value is always plain text, so results count the same answer the same way.
 */
export function PickOrWrite({ value, options, onChange, placeholder, writePlaceholder, label }: {
  value: string
  options: [string, string][]
  onChange: (v: string) => void
  placeholder: string
  writePlaceholder?: string
  label?: string
}) {
  const known = options.some(([en]) => en === value)
  const [writing, setWriting] = useState(Boolean(value) && !known)
  const showInput = writing || (Boolean(value) && !known)
  return (
    <div className="pick-or-write">
      <select aria-label={label ?? placeholder} value={showInput ? OTHER : value} onChange={(e) => {
        if (e.target.value === OTHER) { setWriting(true); onChange('') } else { setWriting(false); onChange(e.target.value) }
      }}>
        <option value="">{placeholder}</option>
        {options.map(([en, ar]) => <option key={en} value={en}>{ar ? `${en} · ${ar}` : en}</option>)}
        <option value={OTHER}>✏️ Other — write it · حاجة تانية، اكتبها</option>
      </select>
      {showInput && <input dir="auto" autoFocus={writing && !value} value={value} onChange={(e) => onChange(e.target.value)} placeholder={writePlaceholder ?? 'Write it here · اكتب هنا'} />}
    </div>
  )
}

/** A drop-down that adds a common answer into a text box; the person can still edit the text. */
function QuickAdd({ options, current, onAdd }: { options: [string, string][]; current?: string; onAdd: (text: string) => void }) {
  const has = (en: string) => (current ?? '').includes(en)
  return (
    <select className="quick-add" value="" aria-label="Add a common answer" onChange={(e) => {
      const v = e.target.value
      if (v) onAdd((current ?? '').trim() ? `${(current ?? '').trim()}, ${v}` : v)
    }}>
      <option value="">➕ Choose a common answer · اختار إجابة جاهزة</option>
      {options.map(([en, ar]) => <option key={en} value={en} disabled={has(en)}>{en} · {ar}</option>)}
    </select>
  )
}

/** One department at a time: score, strengths, weaknesses, ideas. */
export function DeptReviewer({ depts, myDept, index, onIndex, onChange }: {
  depts: Record<string, DeptReview>
  myDept?: string
  index: number
  onIndex: (i: number) => void
  onChange: (key: string, r: DeptReview) => void
}) {
  const d = SURVEY_DEPARTMENTS[index]
  const r = depts[d.key] ?? {}
  // Every department is required now, so an old "skip" is cleared on the first answer.
  const set = (patch: Partial<DeptReview>) => onChange(d.key, { ...r, skip: undefined, ...patch })
  const done = SURVEY_DEPARTMENTS.filter((x) => deptState(depts[x.key]) === 'done').length
  // Once a department is started, point at the boxes still empty in it.
  const flag = deptState(r) === 'partial'
  const miss = (v?: string) => (flag && !answered(v) ? 'missing' : '')
  return (
    <div className="dept-reviewer">
      <div className="dept-tabs" role="tablist">
        {SURVEY_DEPARTMENTS.map((x, i) => (
          <button key={x.key} type="button" role="tab" aria-selected={i === index} className={`dept-tab ${i === index ? 'on' : ''} ${deptState(depts[x.key])}`} style={{ ['--c' as string]: x.color }} onClick={() => onIndex(i)} title={x.name}>
            <span className="dept-tab-emoji">{x.emoji}</span>
            <span className="dept-tab-name">{x.ar}</span>
            {deptState(depts[x.key]) === 'done' && <Check size={12} />}
          </button>
        ))}
      </div>
      <p className="muted small">{done} of {SURVEY_DEPARTMENTS.length} departments done · <span lang="ar" dir="rtl">خلصت {done} من {SURVEY_DEPARTMENTS.length}</span></p>

      <div className="card dept-card" style={{ ['--c' as string]: d.color }}>
        <div className="dept-card-head">
          <span className="dept-emoji">{d.emoji}</span>
          <div className="grow">
            <h2>{d.ar} <span className="muted">· {d.name}</span></h2>
            {myDept === d.key && <span className="pill tone-amber">This is your department — your score is counted separately · دي إدارتك</span>}
          </div>
        </div>

        <>
            <p className="field-label">1. Your opinion of {d.name} <Req /> <span className="ar-inline" lang="ar">١- رأيك في {d.ar}</span></p>
            <ScoreScale value={r.score} onChange={(v) => set({ score: v })} />
            {flag && typeof r.score !== 'number' && <p className="field-missing">Choose a score from 1 to 10 · اختار تقييم</p>}
            <label>
              <span>2. Biggest strengths <Req /></span> <span className="ar-line" lang="ar" dir="rtl">٢- أكبر مميزات {d.ar}</span>
              <QuickAdd options={DEPT_STRENGTH_PICKS} current={r.strengths} onAdd={(t) => set({ strengths: t })} />
              <textarea rows={2} dir="auto" className={miss(r.strengths)} aria-invalid={Boolean(miss(r.strengths))} value={r.strengths ?? ''} onChange={(e) => set({ strengths: e.target.value })} placeholder="e.g. Always answer the phone, fast with hospitals…" />
            </label>
            <label>
              <span>3. Biggest weaknesses <Req /></span> <span className="ar-line" lang="ar" dir="rtl">٣- أكبر عيوب {d.ar}</span>
              <QuickAdd options={DEPT_WEAKNESS_PICKS} current={r.weaknesses} onAdd={(t) => set({ weaknesses: t })} />
              <textarea rows={2} dir="auto" className={miss(r.weaknesses)} aria-invalid={Boolean(miss(r.weaknesses))} value={r.weaknesses ?? ''} onChange={(e) => set({ weaknesses: e.target.value })} placeholder="e.g. Late replies, papers get lost…" />
            </label>
            <label>
              <span>4. Ideas to improve it <Req /></span> <span className="ar-line" lang="ar" dir="rtl">٤- أفكار لتحسين {d.ar}</span>
              <QuickAdd options={DEPT_IDEA_PICKS} current={r.ideas} onAdd={(t) => set({ ideas: t })} />
              <textarea rows={2} dir="auto" className={miss(r.ideas)} aria-invalid={Boolean(miss(r.ideas))} value={r.ideas ?? ''} onChange={(e) => set({ ideas: e.target.value })} placeholder="One clear idea is enough" />
            </label>
        </>
        <div className="row between">
          <button type="button" className="secondary" disabled={index === 0} onClick={() => onIndex(index - 1)}><ArrowLeft size={15} /> {index > 0 ? SURVEY_DEPARTMENTS[index - 1].ar : ''}</button>
          {index < SURVEY_DEPARTMENTS.length - 1 && <button type="button" onClick={() => onIndex(index + 1)}>{SURVEY_DEPARTMENTS[index + 1].ar} <ArrowRight size={15} /></button>}
        </div>
      </div>
    </div>
  )
}

/** Three required names, written freely (no list to choose from), each with an optional reason. */
export function TopThreeNames({ title, ar, value, onChange, icon }: {
  title: string
  ar: string
  value: Nomination[]
  onChange: (v: Nomination[]) => void
  icon?: React.ReactNode
}) {
  const list = [0, 1, 2].map((i) => value[i] ?? { name: '' })
  const set = (i: number, patch: Partial<Nomination>) => onChange(list.map((n, j) => (j === i ? { ...n, ...patch } : n)))
  return (
    <section className="card top-three">
      <h2>{icon ?? <Crown size={18} />} {title} <Req /> <span className="ar-title" lang="ar">{ar}</span></h2>
      {list.map((n, i) => (
        <div key={i} className="top-three-row">
          <span className={`rank-badge m${i + 1}`}>{i + 1}</span>
          <input dir="auto" className="name-input" value={n.name} onChange={(e) => set(i, { name: e.target.value })} placeholder={`${i + 1}. Write the full name · اكتب الاسم بالكامل`} aria-label={`${title} ${i + 1}`} aria-required="true" autoComplete="off" />
          <input dir="auto" className="reason" value={n.reason ?? ''} onChange={(e) => set(i, { reason: e.target.value })} placeholder="Why? (optional) · ليه؟" disabled={!n.name.trim()} />
        </div>
      ))}
    </section>
  )
}

/** Pick three departments in order. */
export function TopThreeDepartments({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <section className="card top-three">
      <h2><Crown size={18} /> Best department <Req /> <span className="ar-title" lang="ar">أحسن إدارة</span></h2>
      <p className="muted small">Tap 3 in order: first tap = 1st place. Tap again to remove. · اختار ٣ بالترتيب</p>
      <div className="chips">
        {SURVEY_DEPARTMENTS.map((d) => {
          const rank = value.indexOf(d.key)
          return (
            <button key={d.key} type="button" className={`chip ${rank >= 0 ? 'on' : ''}`} disabled={rank < 0 && value.length >= 3} onClick={() => onChange(rank >= 0 ? value.filter((k) => k !== d.key) : [...value, d.key])} style={rank >= 0 ? { background: d.color, borderColor: d.color } : undefined}>
              {rank >= 0 && <span className="chip-rank">{rank + 1}</span>}
              <span className="chip-text">{d.emoji} {d.name}<span className="chip-ar" lang="ar">{d.ar}</span></span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

/** A numbered list of short answers; with suggestions, each line is a drop-down with "Other — write it". */
export function NumberedList({ title, ar, count, value, onChange, suggestions, placeholder }: {
  title: string
  ar: string
  count: number
  value: string[]
  onChange: (v: string[]) => void
  suggestions?: [string, string][]
  placeholder?: string
}) {
  const list = Array.from({ length: count }, (_, i) => value[i] ?? '')
  const set = (i: number, v: string) => onChange(list.map((x, j) => (j === i ? v : x)))
  return (
    <section className="card numbered">
      <h2>{title} <Req /> <span className="ar-title" lang="ar">{ar}</span></h2>
      {list.map((v, i) => (
        <div key={i} className="numbered-row">
          <span className="num-badge">{i + 1}</span>
          {suggestions ? (
            <PickOrWrite value={v} options={suggestions.filter(([en]) => en === v || !list.includes(en)).map(([en, a]) => [en, a ?? ARABIC[en] ?? ''])} onChange={(x) => set(i, x)} placeholder={`${i + 1}. Choose · اختار`} writePlaceholder={placeholder} label={`${title} ${i + 1}`} />
          ) : (
            <input dir="auto" value={v} onChange={(e) => set(i, e.target.value)} placeholder={i === 0 ? placeholder : `${i + 1}.`} aria-required="true" />
          )}
        </div>
      ))}
    </section>
  )
}

export function RewardBanner() {
  return (
    <div className="reward-banner">
      <Gift size={26} />
      <div>
        <b>The best idea will be rewarded — and implemented if possible.</b>
        <p lang="ar" dir="rtl">أحسن فكرة هيتم مكافأتها وتنفيذها في حالة الاستطاعة.</p>
      </div>
    </div>
  )
}
