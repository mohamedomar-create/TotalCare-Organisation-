import { useEffect, useState } from 'react'
import { AlertTriangle, ListChecks, MessageSquareText, RotateCcw, Save, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { SURVEY_DEPARTMENTS } from '../lib/survey'
import {
  DEPT_DEFAULTS, LISTS, LIST_DEFAULTS, TEXT_DEFAULTS, TEXT_GROUPS, applySurveyContent, currentContent, listToText, textToList,
  type Bilingual, type ListKey, type SurveyContent, type TextKey,
} from '../lib/surveyContent'

type Tab = 'questions' | 'choices' | 'departments'

/** The super admin improves the survey's wording and answer choices. Only changes are stored. */
export default function AdminQuestions() {
  const saved = currentContent()
  const [tab, setTab] = useState<Tab>('questions')
  const [texts, setTexts] = useState<Record<TextKey, Bilingual>>(() => Object.fromEntries(
    (Object.keys(TEXT_DEFAULTS) as TextKey[]).map((k) => [k, { en: saved.texts?.[k]?.en || TEXT_DEFAULTS[k].en, ar: saved.texts?.[k]?.ar || TEXT_DEFAULTS[k].ar }]),
  ) as Record<TextKey, Bilingual>)
  const [lists, setLists] = useState<Record<ListKey, string>>(() => Object.fromEntries(
    (Object.keys(LISTS) as ListKey[]).map((k) => [k, listToText(LISTS[k].list)]),
  ) as Record<ListKey, string>)
  const [depts, setDepts] = useState(() => Object.fromEntries(SURVEY_DEPARTMENTS.map((d) => [d.key, { name: d.name, ar: d.ar }])))
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  async function save() {
    // Store only what differs from the original wording.
    const content: SurveyContent = { texts: {}, lists: {}, departments: {} }
    for (const k of Object.keys(TEXT_DEFAULTS) as TextKey[]) {
      const t = { en: texts[k].en.trim(), ar: texts[k].ar.trim() }
      if (!t.en || !t.ar) return setNotice({ ok: false, text: `“${TEXT_DEFAULTS[k].en}” needs both English and Arabic.` })
      if (t.en !== TEXT_DEFAULTS[k].en || t.ar !== TEXT_DEFAULTS[k].ar) content.texts![k] = t
    }
    for (const k of Object.keys(LISTS) as ListKey[]) {
      const { list, error } = textToList(lists[k], LISTS[k].picks)
      if (error) return setNotice({ ok: false, text: `${LISTS[k].title}: ${error}` })
      if (list.length < LISTS[k].min) return setNotice({ ok: false, text: `${LISTS[k].title}: keep at least ${LISTS[k].min} choices.` })
      if (listToText(list) !== listToText(LIST_DEFAULTS[k])) content.lists![k] = list
    }
    for (const d of SURVEY_DEPARTMENTS) {
      const v = { name: depts[d.key].name.trim(), ar: depts[d.key].ar.trim() }
      if (!v.name || !v.ar) return setNotice({ ok: false, text: 'Every department needs an English and an Arabic name.' })
      if (v.name !== DEPT_DEFAULTS[d.key].name || v.ar !== DEPT_DEFAULTS[d.key].ar) content.departments![d.key] = v
    }
    setBusy(true)
    const { error } = await supabase.from('survey_content').update({ content }).eq('id', 1)
    setBusy(false)
    if (error) return setNotice({ ok: false, text: /survey_content/.test(error.message) ? 'Run supabase/migrations/0016_survey_content.sql first.' : error.message })
    applySurveyContent(content)
    setDirty(false)
    const n = Object.keys(content.texts!).length + Object.keys(content.lists!).length + Object.keys(content.departments!).length
    setNotice({ ok: true, text: n ? `Saved. ${n} change${n === 1 ? '' : 's'} from the original survey — everyone sees the new wording the next time they open it.` : 'Saved. The survey uses its original wording.' })
  }

  const edit = <T,>(set: (fn: (v: T) => T) => void) => (fn: (v: T) => T) => { set(fn); setDirty(true) }
  const editTexts = edit(setTexts), editLists = edit(setLists), editDepts = edit(setDepts)
  const changedText = (k: TextKey) => texts[k].en !== TEXT_DEFAULTS[k].en || texts[k].ar !== TEXT_DEFAULTS[k].ar
  const changedList = (k: ListKey) => lists[k].trim() !== listToText(LIST_DEFAULTS[k])

  return (
    <div className="page wide questions-page">
      <div className="row between wrap">
        <div>
          <h1>Survey questions <span className="ar-title" lang="ar">أسئلة الاستبيان</span></h1>
          <p className="muted">Improve the wording of the questions and the answer choices. The survey’s steps and departments stay the same, so results remain comparable.</p>
        </div>
        <button type="button" disabled={busy || !dirty} onClick={() => void save()}><Save size={15} /> {busy ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}</button>
      </div>
      {notice && <p className={notice.ok ? 'notice' : 'error'} onClick={() => setNotice(null)}>{notice.text}</p>}
      <p className="notice small"><AlertTriangle size={14} /> Answers already sent keep the words that were on screen when they were given. If you rename a choice after people have answered, the results will show the old and the new wording separately — so make changes before you send the invitations.</p>

      <div className="dash-tabs">
        <button type="button" className={tab === 'questions' ? 'on' : ''} onClick={() => setTab('questions')}><MessageSquareText size={15} /> Questions</button>
        <button type="button" className={tab === 'choices' ? 'on' : ''} onClick={() => setTab('choices')}><ListChecks size={15} /> Answer choices</button>
        <button type="button" className={tab === 'departments' ? 'on' : ''} onClick={() => setTab('departments')}><Users size={15} /> Department names</button>
      </div>

      {tab === 'questions' && TEXT_GROUPS.map((g) => (
        <section key={g.title} className="card">
          <h2>{g.title}</h2>
          {g.keys.map((k) => (
            <div key={k} className={`q-edit ${changedText(k) ? 'changed' : ''}`}>
              <label>English<input value={texts[k].en} onChange={(e) => editTexts((v) => ({ ...v, [k]: { ...v[k], en: e.target.value } }))} /></label>
              <label>Arabic · عربي<input dir="rtl" lang="ar" value={texts[k].ar} onChange={(e) => editTexts((v) => ({ ...v, [k]: { ...v[k], ar: e.target.value } }))} /></label>
              {changedText(k) && <button type="button" className="link small" onClick={() => editTexts((v) => ({ ...v, [k]: { ...TEXT_DEFAULTS[k] } }))}><RotateCcw size={13} /> Original</button>}
            </div>
          ))}
          {g.keys.some((k) => TEXT_DEFAULTS[k].en.includes('{dept}') || TEXT_DEFAULTS[k].ar.includes('{dept}')) && <p className="muted small">Write <code>{'{dept}'}</code> where the department’s name should appear.</p>}
        </section>
      ))}

      {tab === 'choices' && (
        <div className="choices-grid">
          {(Object.keys(LISTS) as ListKey[]).map((k) => (
            <section key={k} className={`card ${changedList(k) ? 'changed' : ''}`}>
              <h2>{LISTS[k].title}</h2>
              <p className="muted small">One choice per line: <b>English | Arabic</b>. {LISTS[k].picks ? 'People can still type their own words in the box. No commas inside a choice — they separate picks.' : '“Other — write it” is always added at the end.'}</p>
              <textarea rows={Math.min(22, lists[k].split('\n').length + 2)} value={lists[k]} onChange={(e) => editLists((v) => ({ ...v, [k]: e.target.value }))} />
              <div className="row between">
                <span className="muted small">{textToList(lists[k], LISTS[k].picks).list.length} choices</span>
                {changedList(k) && <button type="button" className="link small" onClick={() => editLists((v) => ({ ...v, [k]: listToText(LIST_DEFAULTS[k]) }))}><RotateCcw size={13} /> Original list</button>}
              </div>
            </section>
          ))}
        </div>
      )}

      {tab === 'departments' && (
        <section className="card">
          <h2>Department names</h2>
          <p className="muted small">How each department is called in the survey and the results. The departments themselves stay the same.</p>
          {SURVEY_DEPARTMENTS.map((d) => (
            <div key={d.key} className="q-edit">
              <span className="q-dept-emoji">{d.emoji}</span>
              <label>English<input value={depts[d.key].name} onChange={(e) => editDepts((v) => ({ ...v, [d.key]: { ...v[d.key], name: e.target.value } }))} /></label>
              <label>Arabic · عربي<input dir="rtl" lang="ar" value={depts[d.key].ar} onChange={(e) => editDepts((v) => ({ ...v, [d.key]: { ...v[d.key], ar: e.target.value } }))} /></label>
            </div>
          ))}
        </section>
      )}

      <div className="row end"><button type="button" disabled={busy || !dirty} onClick={() => void save()}><Save size={15} /> {busy ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}</button></div>
    </div>
  )
}
