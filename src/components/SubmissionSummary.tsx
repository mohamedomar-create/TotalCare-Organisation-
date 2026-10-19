import { Pencil } from 'lucide-react'
import { ARABIC, RATING_DIMENSIONS, RATING_SCALE } from '../lib/survey'
import { asBoard } from '../lib/orgBoard'
import type { Submission } from '../lib/types'
import { OrgBoardView } from './board/OrgBoardEditor'

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

const empty = <span className="muted">Not answered · لم تتم الإجابة</span>

function Tag({ text }: { text: string }) {
  return (
    <span className="chip on">
      <span className="chip-text">
        {text}
        {ARABIC[text] && <span className="chip-ar" lang="ar">{ARABIC[text]}</span>}
      </span>
    </span>
  )
}

export default function SubmissionSummary({ sub, departmentName, onEdit }: Props) {
  const ideas = (sub.ideas ?? []).filter((i) => i.trim())
  const board = asBoard(sub.structure)
  return (
    <div className="summary">
      <Section title="About you · عنك" step={0} onEdit={onEdit}>
        <p>
          <strong>Department:</strong> {departmentName || 'Prefer not to say'} · <strong>Level:</strong> {sub.role_level || 'Not given'}
        </p>
      </Section>

      <Section title="Quick check · تقييم سريع" step={1} onEdit={onEdit}>
        <div className="pulse-summary">
          {RATING_DIMENSIONS.map((d) => {
            const v = sub.ratings?.[d.key]
            const s = RATING_SCALE.find((x) => x.value === v)
            return (
              <div key={d.key} className="pulse-item">
                <span>{d.question}</span>
                <span className="pulse-value">{s ? `${s.emoji} ${s.label}` : '—'}</span>
              </div>
            )
          })}
        </div>
      </Section>

      <Section title="Your work · شغلك" step={2} onEdit={onEdit}>
        {sub.responsibility_tags.length ? <div className="chips static">{sub.responsibility_tags.map((t) => <Tag key={t} text={t} />)}</div> : empty}
        {sub.responsibilities && <p className="pre quote" dir="auto">{sub.responsibilities}</p>}
      </Section>

      <Section title="Problems · المشاكل" step={3} onEdit={onEdit}>
        {sub.challenge_tags.length ? (
          <ol className="ranked">{sub.challenge_tags.map((t) => <li key={t}>{t}{ARABIC[t] && <span className="muted small" lang="ar"> · {ARABIC[t]}</span>}</li>)}</ol>
        ) : empty}
        {sub.challenges && <p className="pre quote" dir="auto">{sub.challenges}</p>}
      </Section>

      <Section title="Org chart · الهيكل التنظيمي" step={4} onEdit={onEdit}>
        {board.roles.length ? <OrgBoardView board={board} /> : empty}
      </Section>

      <Section title="Ideas · أفكارك" step={5} onEdit={onEdit}>
        {ideas.length ? <ol>{ideas.map((i, n) => <li key={n} dir="auto">{i}</li>)}</ol> : empty}
        {sub.quick_win && <p dir="auto"><strong>Change tomorrow:</strong> {sub.quick_win}</p>}
        {sub.enps !== null && sub.enps !== undefined && (
          <p><strong>Would recommend TotalCare as a workplace:</strong> {sub.enps} / 10</p>
        )}
        {sub.suggestions && <p className="pre quote" dir="auto">{sub.suggestions}</p>}
      </Section>
    </div>
  )
}
