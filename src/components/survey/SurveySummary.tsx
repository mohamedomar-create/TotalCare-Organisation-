import { Pencil } from 'lucide-react'
import { MY_DEPARTMENT_EXTRA, SURVEY_DEPARTMENTS, deptByKey, type SurveyAnswers } from '../../lib/survey'

function Section({ title, step, onEdit, children }: { title: string; step: number; onEdit?: (s: number) => void; children: React.ReactNode }) {
  return (
    <section className="card summary-section">
      <div className="row between">
        <h3>{title}</h3>
        {onEdit && <button type="button" className="link" onClick={() => onEdit(step)}><Pencil size={14} /> Edit</button>}
      </div>
      {children}
    </section>
  )
}

const none = <span className="muted">Not answered · لم تتم الإجابة</span>
const clean = (xs?: string[]) => (xs ?? []).map((x) => x?.trim()).filter(Boolean) as string[]

export default function SurveySummary({ answers, onEdit }: { answers: SurveyAnswers; onEdit?: (step: number) => void }) {
  const my = deptByKey(answers.my_dept ?? '') ?? MY_DEPARTMENT_EXTRA.find((x) => x.key === answers.my_dept)
  const managers = (answers.best_managers ?? []).filter((n) => n.name?.trim())
  const employees = (answers.best_employees ?? []).filter((n) => n.name?.trim())
  return (
    <div className="summary">
      <Section title="Your department · إدارتك" step={0} onEdit={onEdit}>
        <p>
          {my ? `${my.name} · ${my.ar}` : <span className="muted">Not chosen yet</span>}
        </p>
      </Section>

      <Section title="Departments · الإدارات" step={1} onEdit={onEdit}>
        <div className="dept-summary">
          {SURVEY_DEPARTMENTS.map((d) => {
            const r = answers.depts?.[d.key]
            return (
              <div key={d.key} className="dept-summary-row" style={{ ['--c' as string]: d.color }}>
                <div className="row between">
                  <strong>{d.emoji} {d.ar} · {d.name}</strong>
                  {r?.skip ? <span className="pill tone-slate">Skipped</span> : typeof r?.score === 'number' ? <span className={`score-pill s${r.score}`}>{r.score}/10</span> : <span className="muted small">—</span>}
                </div>
                {!r?.skip && (
                  <ul className="small">
                    {r?.strengths?.trim() && <li dir="auto"><b>+</b> {r.strengths}</li>}
                    {r?.weaknesses?.trim() && <li dir="auto"><b>−</b> {r.weaknesses}</li>}
                    {r?.ideas?.trim() && <li dir="auto"><b>💡</b> {r.ideas}</li>}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      </Section>

      <Section title="The best · الأحسن" step={2} onEdit={onEdit}>
        <p><strong>Best manager <span lang="ar" dir="rtl">(أحسن مدير)</span>:</strong> {managers.length ? managers.map((n, i) => `${i + 1}. ${n.name}`).join('  ') : none}</p>
        <p><strong>Best department <span lang="ar" dir="rtl">(أحسن إدارة)</span>:</strong> {answers.best_departments?.length ? answers.best_departments.map((k, i) => `${i + 1}. ${deptByKey(k)?.name ?? k}`).join('  ') : none}</p>
        <p><strong>Best employee <span lang="ar" dir="rtl">(أحسن موظف)</span>:</strong> {employees.length ? employees.map((n, i) => `${i + 1}. ${n.name}`).join('  ') : none}</p>
      </Section>

      <Section title="The company · الشركة" step={3} onEdit={onEdit}>
        <p><strong>Biggest problems · أكبر المشاكل</strong></p>
        {clean(answers.company_problems).length ? <ol>{clean(answers.company_problems).map((t, i) => <li key={i} dir="auto">{t}</li>)}</ol> : none}
        <p><strong>Best strengths · أحسن المميزات</strong></p>
        {clean(answers.company_strengths).length ? <ol>{clean(answers.company_strengths).map((t, i) => <li key={i} dir="auto">{t}</li>)}</ol> : none}
      </Section>

      <Section title="Ideas · الأفكار" step={4} onEdit={onEdit}>
        {clean(answers.company_ideas).length ? <ol>{clean(answers.company_ideas).map((t, i) => <li key={i} dir="auto">{t}</li>)}</ol> : none}
      </Section>
    </div>
  )
}
