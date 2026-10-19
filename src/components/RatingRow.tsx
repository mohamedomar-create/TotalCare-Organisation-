import { RATING_SCALE } from '../lib/survey'

export default function RatingRow({ question, ar, value, onChange, disabled }: {
  question: string
  ar?: string
  value?: number
  onChange: (v: number) => void
  disabled?: boolean
}) {
  return (
    <div className={`rating-row ${value ? 'answered' : ''}`}>
      <p className="rating-q">
        {question}
        {ar && <span className="ar-line" lang="ar" dir="rtl">{ar}</span>}
      </p>
      <div className="rating-scale" role="radiogroup" aria-label={question}>
        {RATING_SCALE.map((s) => (
          <button
            key={s.value}
            type="button"
            role="radio"
            aria-checked={value === s.value}
            className={`rating-btn ${value === s.value ? 'on' : ''}`}
            onClick={() => onChange(s.value)}
            disabled={disabled}
            title={`${s.label} · ${s.ar}`}
          >
            <span className="rating-emoji">{s.emoji}</span>
            <span className="rating-label">{s.label}</span>
            <span className="rating-label" lang="ar">{s.ar}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
