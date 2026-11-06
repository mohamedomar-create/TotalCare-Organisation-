// Content for the TotalCare people survey, in simple English with Egyptian Arabic.
// Edit these lists to change the questions. Answers are stored by their English text (or key).
//
// Design: 16 themes, each rated on one face scale (1–5). Five extra "check" questions are worded the
// other way round and asked on a different screen; comparing them with their theme shows whether the
// answers are consistent (see quality.ts). Old answers stored under retired keys are simply ignored.

type Pair = [en: string, ar: string]

const toMap = (pairs: Pair[]) => Object.fromEntries(pairs) as Record<string, string>

const LEVELS: Pair[] = [
  ['Driver / worker / assistant', 'سواق / عامل / مساعد'],
  ['Staff / technician', 'موظف / فني'],
  ['Engineer / specialist / rep', 'مهندس / أخصائي / مندوب'],
  ['Supervisor / team lead', 'مشرف / قائد فريق'],
  ['Manager / head', 'مدير / رئيس قسم'],
  ['Director / MD', 'مدير إدارة / عضو منتدب'],
]
export const ROLE_LEVELS = LEVELS.map(([en]) => en)

const TENURE: Pair[] = [
  ['Less than 1 year', 'أقل من سنة'],
  ['1–3 years', 'من سنة لـ ٣ سنين'],
  ['3–5 years', 'من ٣ لـ ٥ سنين'],
  ['More than 5 years', 'أكتر من ٥ سنين'],
]
export const TENURE_OPTIONS = TENURE.map(([en]) => en)

const LOCATIONS: Pair[] = [
  ['Head office (Cairo)', 'المقر الرئيسي (القاهرة)'],
  ['Alexandria & Delta', 'إسكندرية والدلتا'],
  ['Upper Egypt', 'الصعيد'],
  ['Canal & Sinai', 'القناة وسيناء'],
  ['Warehouse', 'المخزن'],
  ['In the field (hospitals, patients’ homes)', 'في الميدان (مستشفيات، بيوت المرضى)'],
]
export const LOCATION_OPTIONS = LOCATIONS.map(([en]) => en)

const STAY: Pair[] = [
  ['Still here, growing', 'لسه هنا وبكبر'],
  ['Still here, but not sure', 'لسه هنا بس مش متأكد'],
  ['Probably somewhere else', 'غالباً في مكان تاني'],
]
export const STAY_OPTIONS = STAY.map(([en]) => en)

export interface RatingDimension {
  key: string
  label: string
  question: string
  ar: string
  group: 'you' | 'work'
}

/** The 16 themes. Their averages drive the dashboard, the heat map and the suggested initiatives. */
export const RATING_DIMENSIONS: RatingDimension[] = [
  // You and your team
  { group: 'you', key: 'clarity', label: 'Clear role', question: 'I know exactly what is expected from me.', ar: 'أعرف بالظبط المطلوب مني.' },
  { group: 'you', key: 'manager', label: 'Manager support', question: 'My direct manager supports me and gives me useful feedback.', ar: 'مديري المباشر بيدعمني وبيديني ملاحظات مفيدة.' },
  { group: 'you', key: 'recognition', label: 'Recognition', question: 'When I do good work, it is noticed and appreciated.', ar: 'لما بشتغل كويس، ده بيتلاحظ وبيتقدّر.' },
  { group: 'you', key: 'pay', label: 'Fair pay', question: 'My salary and incentives are fair for my effort and today’s prices.', ar: 'مرتبي والحوافز عادلين بالنسبة لمجهودي وللأسعار دلوقتي.' },
  { group: 'you', key: 'workload', label: 'Workload', question: 'I can finish my work within normal working hours.', ar: 'أقدر أخلّص شغلي في مواعيد الشغل العادية.' },
  { group: 'you', key: 'growth', label: 'Growth', question: 'I am learning and I can see a future for myself at TotalCare.', ar: 'بتعلّم وشايف لنفسي مستقبل في TotalCare.' },
  { group: 'you', key: 'speakup', label: 'Safe to speak', question: 'I can raise a problem or a mistake without fear.', ar: 'أقدر أتكلم عن مشكلة أو غلطة من غير خوف.' },
  { group: 'you', key: 'pride', label: 'Pride', question: 'I am proud to work at TotalCare.', ar: 'فخور إني بشتغل في TotalCare.' },
  // How work flows
  { group: 'work', key: 'communication', label: 'Information', question: 'I get the information I need, on time.', ar: 'المعلومة اللي محتاجها بتوصلي في وقتها.' },
  { group: 'work', key: 'decisions', label: 'Fast approvals', question: 'Approvals and decisions are fast enough to serve our customers.', ar: 'الموافقات والقرارات بتتاخد بسرعة كفاية علشان نخدم العملاء.' },
  { group: 'work', key: 'tools', label: 'Tools', question: 'I have the tools I need: car, laptop, phone, demo devices, spare parts.', ar: 'عندي الأدوات اللي محتاجها: عربية، لابتوب، موبايل، أجهزة ديمو، قطع غيار.' },
  { group: 'work', key: 'systems', label: 'Odoo, not WhatsApp', question: 'Our work is recorded in Odoo, not lost in WhatsApp or on paper.', ar: 'شغلنا متسجل على Odoo، مش ضايع في الواتساب أو على الورق.' },
  { group: 'work', key: 'collaboration', label: 'Teamwork', question: 'Other departments help me when I need them.', ar: 'الإدارات التانية بتساعدني لما أحتاجها.' },
  { group: 'work', key: 'customer', label: 'Customer promise', question: 'We deliver what we promise to hospitals and patients, on time.', ar: 'بنسلّم اللي وعدنا بيه للمستشفيات والمرضى في ميعاده.' },
  { group: 'work', key: 'compliance', label: 'Doing it right', question: 'We follow EDA, tender and quality rules, even under pressure.', ar: 'بنلتزم بقواعد هيئة الدواء والمناقصات والجودة، حتى وإحنا تحت ضغط.' },
  { group: 'work', key: 'training', label: 'Training', question: 'I got enough training on our products and systems.', ar: 'خدت تدريب كفاية على منتجاتنا والأنظمة.' },
]

export interface CheckItem {
  key: string
  /** the theme this question checks; it is worded the opposite way */
  pairOf: string
  question: string
  ar: string
  /** asked on the other screen from its theme, so people answer it fresh */
  group: 'you' | 'work'
}

export const CHECK_ITEMS: CheckItem[] = [
  { key: 'r_clarity', pairOf: 'clarity', group: 'work', question: 'I often don’t know which tasks are mine and which belong to others.', ar: 'كتير مبعرفش أنهي مهمة بتاعتي وأنهي بتاعة غيري.' },
  { key: 'r_workload', pairOf: 'workload', group: 'work', question: 'I regularly work late or on my days off to finish my tasks.', ar: 'دايماً بشتغل متأخر أو في إجازتي علشان أخلّص شغلي.' },
  { key: 'r_recognition', pairOf: 'recognition', group: 'work', question: 'My effort usually goes unnoticed.', ar: 'مجهودي غالباً محدش بياخد باله منه.' },
  { key: 'r_decisions', pairOf: 'decisions', group: 'you', question: 'My work often stops while I wait for a signature or approval.', ar: 'شغلي كتير بيقف وأنا مستني توقيع أو موافقة.' },
  { key: 'r_systems', pairOf: 'systems', group: 'you', question: 'Most of my orders and follow-ups happen on WhatsApp or by phone.', ar: 'معظم الطلبات والمتابعات بتاعتي بتحصل على الواتساب أو بالتليفون.' },
]

/** Theme questions and check questions mixed for one screen, in a fixed but non-obvious order. */
export function screenItems(group: 'you' | 'work') {
  const themes = RATING_DIMENSIONS.filter((d) => d.group === group).map((d) => ({ key: d.key, question: d.question, ar: d.ar }))
  const checks = CHECK_ITEMS.filter((c) => c.group === group).map((c) => ({ key: c.key, question: c.question, ar: c.ar }))
  const out = [...themes]
  checks.forEach((c, i) => out.splice(Math.min(out.length, 2 + i * 3), 0, c))
  return out
}

export const RATING_SCALE = [
  { value: 1, emoji: '😞', label: 'No', ar: 'لا' },
  { value: 2, emoji: '🙁', label: 'Not really', ar: 'مش أوي' },
  { value: 3, emoji: '😐', label: 'Sometimes', ar: 'أحياناً' },
  { value: 4, emoji: '🙂', label: 'Mostly', ar: 'غالباً' },
  { value: 5, emoji: '😄', label: 'Yes', ar: 'أيوه' },
]

const RESPONSIBILITIES: Pair[] = [
  ['Visiting hospitals & clients', 'زيارة المستشفيات والعملاء'],
  ['Tenders (UPA, MOH, universities)', 'المناقصات (الشراء الموحد، الصحة، الجامعات)'],
  ['Selling & quotations', 'البيع وعروض الأسعار'],
  ['Homecare patients', 'مرضى الرعاية المنزلية'],
  ['Installing devices', 'تركيب الأجهزة'],
  ['Maintenance & repairs', 'الصيانة والإصلاح'],
  ['Training doctors & nurses', 'تدريب الأطباء والتمريض'],
  ['Marketing & events', 'التسويق والفعاليات'],
  ['Import & customs', 'الاستيراد والجمارك'],
  ['EDA registration', 'تسجيل هيئة الدواء'],
  ['Warehouse & stock', 'المخازن والمخزون'],
  ['Delivery & drivers', 'التوصيل والسواقين'],
  ['Invoices & collections', 'الفواتير والتحصيل'],
  ['Accounting & tax', 'الحسابات والضرائب'],
  ['Data entry in Odoo', 'إدخال البيانات على Odoo'],
  ['HR, payroll & insurance', 'الموارد البشرية والمرتبات والتأمينات'],
  ['Contracts & legal', 'العقود والشؤون القانونية'],
  ['Quality & ISO', 'الجودة والأيزو'],
  ['Managing a team', 'إدارة فريق'],
]
export const RESPONSIBILITY_OPTIONS = RESPONSIBILITIES.map(([en]) => en)

const CHALLENGES: Pair[] = [
  ['Not clear who decides', 'مش واضح مين صاحب القرار'],
  ['Too many signatures / approvals', 'توقيعات وموافقات كتير'],
  ['Same work done twice', 'نفس الشغل بيتعمل مرتين'],
  ['Information comes late', 'المعلومة بتوصل متأخر'],
  ['Work runs on WhatsApp, not a system', 'الشغل ماشي على الواتساب مش على سيستم'],
  ['Odoo not used properly', 'Odoo مش مستخدم صح'],
  ['Late payments & collections', 'تأخير التحصيل والمدفوعات'],
  ['Government tenders pay late', 'المناقصات الحكومية بتدفع متأخر'],
  ['Customs & import delays', 'تأخير الجمارك والاستيراد'],
  ['Dollar / price changes hit our quotes', 'تغيّر الدولار والأسعار بيبوّظ عروض الأسعار'],
  ['EDA registration delays', 'تأخير تسجيل هيئة الدواء'],
  ['Stock or spare parts not available on time', 'المخزون أو قطع الغيار مش متاحة في وقتها'],
  ['Too much travel / traffic', 'سفر ومشاوير ومواصلات كتير'],
  ['Not enough people', 'عدد الأفراد قليل'],
  ['Missing tools (car, laptop, phone)', 'أدوات ناقصة (عربية، لابتوب، موبايل)'],
  ['Not enough training', 'تدريب مش كفاية'],
  ['Departments don’t cooperate', 'الإدارات مش متعاونة'],
  ['Salary not keeping up with prices', 'المرتب مش ماشي مع الأسعار'],
  ['No clear career path', 'مفيش مسار وظيفي واضح'],
  ['Effort not recognised', 'المجهود مش متقدّر'],
]
export const CHALLENGE_OPTIONS = CHALLENGES.map(([en]) => en)

// Arabic for any stored English answer.
export const ARABIC: Record<string, string> = {
  ...toMap(LEVELS), ...toMap(RESPONSIBILITIES), ...toMap(CHALLENGES), ...toMap(TENURE), ...toMap(LOCATIONS), ...toMap(STAY),
}

export const MAX_CHALLENGES = 5

export const FEEDBACK_CATEGORIES = [
  { value: 'idea', label: 'Idea', emoji: '💡' },
  { value: 'issue', label: 'Problem', emoji: '⚠️' },
  { value: 'question', label: 'Question', emoji: '❓' },
  { value: 'praise', label: 'Thanks', emoji: '👏' },
] as const

/** Categories for the anonymous Speak-up channel. */
export const SAFE_CATEGORIES = [
  { value: 'concern', label: 'A concern', ar: 'قلق أو مشكلة', emoji: '💬' },
  { value: 'manager', label: 'About a manager', ar: 'بخصوص مدير', emoji: '👤' },
  { value: 'harassment', label: 'Harassment or bullying', ar: 'تحرش أو تنمر', emoji: '🛑' },
  { value: 'ethics', label: 'Ethics: gifts, tenders, fraud', ar: 'أمانة: هدايا، مناقصات، تلاعب', emoji: '⚖️' },
  { value: 'safety', label: 'Health & safety', ar: 'الصحة والسلامة', emoji: '🦺' },
  { value: 'pay', label: 'Pay or contract', ar: 'المرتب أو العقد', emoji: '💰' },
  { value: 'idea', label: 'An idea', ar: 'فكرة', emoji: '💡' },
  { value: 'other', label: 'Something else', ar: 'حاجة تانية', emoji: '✳️' },
] as const

/** The departments everyone reviews, in the order of the survey. */
export interface SurveyDepartment {
  key: string
  name: string
  ar: string
  emoji: string
  color: string
}

export const SURVEY_DEPARTMENTS: SurveyDepartment[] = [
  { key: 'marketing', name: 'Marketing', ar: 'إدارة التسويق', emoji: '📣', color: '#db2777' },
  { key: 'installations', name: 'Installations', ar: 'التركيبات', emoji: '🔧', color: '#0e7490' },
  { key: 'collections', name: 'Collections', ar: 'التحصيل', emoji: '💵', color: '#16a34a' },
  { key: 'accounting', name: 'Accounting', ar: 'الحسابات', emoji: '🧾', color: '#4f46e5' },
  { key: 'sales', name: 'Sales', ar: 'المبيعات', emoji: '🤝', color: '#ea580c' },
  { key: 'maintenance', name: 'Maintenance', ar: 'الصيانة', emoji: '🛠️', color: '#0891b2' },
  { key: 'purchasing', name: 'Purchasing & Warehouses', ar: 'المشتريات والمخازن', emoji: '📦', color: '#a16207' },
  { key: 'hr_legal', name: 'HR & Legal', ar: 'الموارد البشرية والقانوني', emoji: '⚖️', color: '#7c3aed' },
]

/** Respondent's own department choices: the reviewed departments plus a few that aren't reviewed. */
export const MY_DEPARTMENT_EXTRA = [
  { key: 'management', name: 'Management', ar: 'الإدارة العليا' },
  { key: 'other', name: 'Other', ar: 'أخرى' },
]

export const deptByKey = (key: string) => SURVEY_DEPARTMENTS.find((d) => d.key === key)

/** Tap-to-fill suggestions so similar answers are written the same way and can be counted. */
export const PROBLEM_SUGGESTIONS = CHALLENGES
const STRENGTHS: Pair[] = [
  ['Strong brands and suppliers', 'براندات وموردين أقوياء'],
  ['Hospitals and doctors trust us', 'المستشفيات والدكاترة بيثقوا فينا'],
  ['Experienced engineers and technicians', 'مهندسين وفنيين عندهم خبرة'],
  ['Good team spirit', 'روح الفريق حلوة'],
  ['Management listens', 'الإدارة بتسمع'],
  ['Salaries paid on time', 'المرتبات بتنزل في ميعادها'],
  ['Fast after-sales service', 'خدمة ما بعد البيع سريعة'],
  ['Wide range of products', 'منتجات كتير ومتنوعة'],
  ['Stable, respected company', 'شركة مستقرة ولها اسمها'],
  ['Chances to learn', 'فرص للتعلم'],
]
export const STRENGTH_SUGGESTIONS = STRENGTHS
Object.assign(ARABIC, toMap(STRENGTHS))

export const WIZARD_STEPS = [
  { key: 'about', title: 'Department', ar: 'إدارتك', hint: '5 seconds' },
  { key: 'departments', title: 'Departments', ar: 'الإدارات', hint: '8 departments' },
  { key: 'best', title: 'The best', ar: 'الأحسن', hint: 'Top 3' },
  { key: 'company', title: 'The company', ar: 'الشركة', hint: 'Problems & strengths' },
  { key: 'ideas', title: 'Ideas', ar: 'الأفكار', hint: 'Best idea wins' },
  { key: 'review', title: 'Check & send', ar: 'راجع وابعت', hint: 'Last step' },
] as const

export interface DeptReview {
  /** 1–10 */
  score?: number
  strengths?: string
  weaknesses?: string
  ideas?: string
  /** "I don't deal with this department" */
  skip?: boolean
}

export interface Nomination {
  name: string
  reason?: string
}

/** Everything the survey asks, stored in submissions.answers (version 2). */
export interface SurveyAnswers {
  v?: 2
  /** respondent's own department key (from SURVEY_DEPARTMENTS or MY_DEPARTMENT_EXTRA) */
  my_dept?: string
  tenure?: string
  location?: string
  depts?: Record<string, DeptReview>
  best_managers?: Nomination[]
  best_departments?: string[]
  best_employees?: Nomination[]
  company_problems?: string[]
  company_strengths?: string[]
  company_ideas?: string[]
  /** lets an anonymous author claim the best-idea reward */
  reward_code?: string
  // Kept from the first version of the survey
  stay?: string
  volunteer?: string[]
  /** when the person first answered, to spot rushed answers */
  started_at?: string
  /** checks the person confirmed on the review screen ("yes, that's right") */
  confirmed?: string[]
}
