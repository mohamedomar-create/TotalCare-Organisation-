// Content for the step-by-step submission, in simple English with Arabic.
// Edit these lists to change the questions. Answers are stored by their English text.

type Pair = [en: string, ar: string]

const toMap = (pairs: Pair[]) => Object.fromEntries(pairs) as Record<string, string>

const LEVELS: Pair[] = [
  ['Staff / technician', 'موظف / فني'],
  ['Engineer / specialist / rep', 'مهندس / أخصائي / مندوب'],
  ['Supervisor / team lead', 'مشرف / قائد فريق'],
  ['Manager / head', 'مدير / رئيس قسم'],
  ['Director / GM', 'مدير إدارة / مدير عام'],
]
export const ROLE_LEVELS = LEVELS.map(([en]) => en)

export interface RatingDimension {
  key: string
  label: string
  question: string
  ar: string
}

export const RATING_DIMENSIONS: RatingDimension[] = [
  { key: 'clarity', label: 'Clear job', question: 'I know exactly what my job is.', ar: 'أعرف شغلي بالظبط.' },
  { key: 'structure', label: 'Clear manager', question: 'I know who my direct manager is.', ar: 'أعرف مين مديري المباشر.' },
  { key: 'communication', label: 'Information', question: 'I get the information I need on time.', ar: 'المعلومات بتوصلي في وقتها.' },
  { key: 'decisions', label: 'Fast decisions', question: 'Decisions and approvals are fast.', ar: 'القرارات والموافقات بتتاخد بسرعة.' },
  { key: 'workload', label: 'Fair workload', question: 'My workload is fair.', ar: 'حجم الشغل عليّ مناسب.' },
  { key: 'tools', label: 'Tools', question: 'I have the tools I need (car, laptop, Odoo, phone…).', ar: 'عندي الأدوات اللي محتاجها (عربية، لابتوب، Odoo، موبايل…).' },
  { key: 'collaboration', label: 'Teamwork', question: 'Departments help each other.', ar: 'الإدارات بتساعد بعض.' },
  { key: 'growth', label: 'Future', question: 'I can see a future for myself at TotalCare.', ar: 'شايف لنفسي مستقبل في TotalCare.' },
]

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
  ['Customs & import delays', 'تأخير الجمارك والاستيراد'],
  ['EDA registration delays', 'تأخير تسجيل هيئة الدواء'],
  ['Stock not available on time', 'المخزون مش متاح في وقته'],
  ['Too much travel / traffic', 'سفر ومشاوير ومواصلات كتير'],
  ['Not enough people', 'عدد الأفراد قليل'],
  ['Missing tools (car, laptop, phone)', 'أدوات ناقصة (عربية، لابتوب، موبايل)'],
  ['Not enough training', 'تدريب مش كفاية'],
  ['Departments don’t cooperate', 'الإدارات مش متعاونة'],
  ['No clear career path', 'مفيش مسار وظيفي واضح'],
  ['Effort not recognised', 'المجهود مش متقدّر'],
]
export const CHALLENGE_OPTIONS = CHALLENGES.map(([en]) => en)

// Arabic for any stored English answer.
export const ARABIC: Record<string, string> = { ...toMap(LEVELS), ...toMap(RESPONSIBILITIES), ...toMap(CHALLENGES) }

export const MAX_CHALLENGES = 5

export const FEEDBACK_CATEGORIES = [
  { value: 'idea', label: 'Idea', emoji: '💡' },
  { value: 'issue', label: 'Problem', emoji: '⚠️' },
  { value: 'question', label: 'Question', emoji: '❓' },
  { value: 'praise', label: 'Thanks', emoji: '👏' },
] as const

export const WIZARD_STEPS = [
  { key: 'about', title: 'About you', ar: 'عنك', hint: '30 seconds' },
  { key: 'pulse', title: 'Quick check', ar: 'تقييم سريع', hint: 'Tap a face' },
  { key: 'role', title: 'Your work', ar: 'شغلك', hint: 'Tap what you do' },
  { key: 'challenges', title: 'Problems', ar: 'المشاكل', hint: 'Pick up to 5' },
  { key: 'vision', title: 'Org chart', ar: 'الهيكل التنظيمي', hint: 'Drag and drop' },
  { key: 'ideas', title: 'Ideas', ar: 'أفكارك', hint: 'Your suggestions' },
  { key: 'review', title: 'Send', ar: 'إرسال', hint: 'Check and send' },
] as const
