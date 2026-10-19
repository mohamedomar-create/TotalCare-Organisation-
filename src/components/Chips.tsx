import { Check, Plus } from 'lucide-react'
import { useState } from 'react'

interface Props {
  options: string[]
  selected: string[]
  onChange: (next: string[]) => void
  max?: number
  ranked?: boolean
  allowCustom?: boolean
  disabled?: boolean
}

export default function Chips({ options, selected, onChange, max, ranked, allowCustom, disabled }: Props) {
  const [custom, setCustom] = useState('')
  const all = [...options, ...selected.filter((s) => !options.includes(s))]
  const full = max !== undefined && selected.length >= max

  function toggle(option: string) {
    if (disabled) return
    if (selected.includes(option)) onChange(selected.filter((s) => s !== option))
    else if (!full) onChange([...selected, option])
  }

  function addCustom() {
    const v = custom.trim()
    if (!v || selected.includes(v) || full) return
    onChange([...selected, v])
    setCustom('')
  }

  return (
    <div>
      <div className="chips">
        {all.map((o) => {
          const index = selected.indexOf(o)
          const on = index >= 0
          return (
            <button
              key={o}
              type="button"
              className={`chip ${on ? 'on' : ''}`}
              disabled={disabled || (!on && full)}
              onClick={() => toggle(o)}
              aria-pressed={on}
            >
              {on && (ranked ? <span className="chip-rank">{index + 1}</span> : <Check size={14} />)}
              {o}
            </button>
          )
        })}
      </div>
      {allowCustom && !disabled && (
        <div className="chip-custom">
          <input
            placeholder="Add your own…"
            value={custom}
            disabled={full}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addCustom()
              }
            }}
          />
          <button type="button" className="secondary" onClick={addCustom} disabled={!custom.trim() || full}>
            <Plus size={15} /> Add
          </button>
        </div>
      )}
      {max !== undefined && (
        <p className="muted small">
          {selected.length} of {max} selected{full ? ' — remove one to pick another' : ''}
        </p>
      )}
    </div>
  )
}
