import { Pencil } from 'lucide-react'
import { RATING_DIMENSIONS, RATING_SCALE } from '../lib/survey'
import type { Submission } from '../lib/types'
import DiagramEditor from './diagram/DiagramEditor'

interface Props {
  sub: Submission
  departmentName?: string
  onEdit?: (step: number) => void
}

function Section({ title, step, onEdit, children }: { title: string; step: number; onEdit?: (s: number) => void; children: React.ReactNode }) {
  return (
    <section className="card summary-section">
      <div className="row between">
        <h3>{title}</h3>
        {onEdit && (
          <button type="button" className="link" onClick={() => onEdit(step)}>
            <Pencil size={14} /> Edit
          </button>
        )}
      </div>
      {children}
    </section>
  )
}

const empty = <span className="muted">Not answered</span>

export default function SubmissionSummary({ sub, departmentName, onEdit }: Props) {
  const ideas = (sub.ideas ?? []).filter((i) => i.trim())
  return (
    <div className="summary">
      <Section title="About you" step={0} onEdit={onEdit}>
        <p>
          <strong>Department:</strong> {departmentName || 'Prefer not to say'} · <strong>Level:</strong> {sub.role_level || 'Not given'}
        </p>
      </Section>

      <Section title="Quick pulse" step={1} onEdit={onEdit}>
        <div className="pulse-summary">
          {RATING_DIMENSIONS.map((d) => {
            const v = sub.ratings?.[d.key]
            const s = RATING_SCALE.find((x) => x.value === v)
            return (
              <div key={d.key} className="pulse-item">
                <span>{d.label}</span>
                <span className="pulse-value">{s ? `${s.emoji} ${s.label}` : '—'}</span>
              </div>
            )
          })}
        </div>
      </Section>

      <Section title="Your role" step={2} onEdit={onEdit}>
        {sub.responsibility_tags.length ? (
          <div className="chips static">{sub.responsibility_tags.map((t) => <span key={t} className="chip on">{t}</span>)}</div>
        ) : empty}
        {sub.responsibilities && <p className="pre quote">{sub.responsibilities}</p>}
      </Section>

      <Section title="Challenges" step={3} onEdit={onEdit}>
        {sub.challenge_tags.length ? (
          <ol className="ranked">{sub.challenge_tags.map((t) => <li key={t}>{t}</li>)}</ol>
        ) : empty}
        {sub.challenges && <p className="pre quote">{sub.challenges}</p>}
      </Section>

      <Section title="Your vision" step={4} onEdit={onEdit}>
        {sub.structure.nodes.length ? (
          <DiagramEditor key={`${sub.id}-${sub.updated_at}`} value={sub.structure} readOnly height={340} />
        ) : empty}
      </Section>

      <Section title="Ideas" step={5} onEdit={onEdit}>
        {ideas.length ? <ol>{ideas.map((i, n) => <li key={n}>{i}</li>)}</ol> : empty}
        {sub.quick_win && <p><strong>Change tomorrow:</strong> {sub.quick_win}</p>}
        {sub.enps !== null && sub.enps !== undefined && (
          <p><strong>Would recommend TotalCare as a workplace:</strong> {sub.enps} / 10</p>
        )}
        {sub.suggestions && <p className="pre quote">{sub.suggestions}</p>}
      </Section>
    </div>
  )
}
