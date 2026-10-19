// The org board: departments as columns, levels as rows, role cards dragged into place.
// Departments and roles follow TotalCare Egypt's own org board.

export interface BoardDept {
  id: string
  en: string
  ar: string
  color: string
}

export interface BoardRole {
  id: string
  en: string
  ar: string
  dept: string // department id, or TOP for the management row
  layer: number // index into LAYERS
  count: number // number of people in this role
  duties: string // one per line
  reportsTo?: string | null // role id; empty = the default (head of the same department, else the GM)
}

export interface OrgBoard {
  depts: BoardDept[]
  roles: BoardRole[]
}

export const TOP = 'top'

export const LAYERS = [
  { en: 'Management', ar: 'الإدارة العليا' },
  { en: 'Department heads', ar: 'رؤساء الإدارات' },
  { en: 'Team leads', ar: 'قادة الفرق' },
  { en: 'Specialists & field staff', ar: 'الأخصائيون والفريق الميداني' },
]

export const DEFAULT_DEPTS: BoardDept[] = [
  { id: 'com', en: 'Commercial', ar: 'الإدارة التجارية', color: '#1F7A8C' },
  { id: 'pc', en: 'Portfolio & Clinical', ar: 'المحفظة والشؤون السريرية', color: '#3F5FA8' },
  { id: 'svc', en: 'Service', ar: 'الصيانة والخدمة', color: '#247A4A' },
  { id: 'sc', en: 'Supply Chain & Regulatory', ar: 'سلسلة الإمداد والشؤون التنظيمية', color: '#9A5F10' },
  { id: 'fin', en: 'Finance & Odoo', ar: 'المالية ونظام Odoo', color: '#6E4FA3' },
  { id: 'ppl', en: 'People & Admin', ar: 'الموارد البشرية والشؤون الإدارية', color: '#A24A78' },
  { id: 'qia', en: 'Quality & Audit', ar: 'الجودة والمراجعة الداخلية', color: '#B23A3A' },
]

export const DEPT_COLORS = ['#1F7A8C', '#3F5FA8', '#247A4A', '#9A5F10', '#6E4FA3', '#A24A78', '#B23A3A', '#5C6773', '#2F7F6F', '#8A6D00']

export interface CatalogueRole {
  key: string
  en: string
  ar: string
  dept: string
  layer: number
  duties: string
  suggested?: number // people in the suggested starting board; absent = library only
}

// Ready-made roles people can drag onto the board.
export const CATALOGUE: CatalogueRole[] = [
  { key: 'gm', en: 'General Manager', ar: 'المدير العام', dept: TOP, layer: 0, suggested: 1, duties: 'قيادة الاستراتيجية والعلاقة مع الموردين\nاعتماد الميزانية والحدود المالية\nالاجتماع الشهري مع رؤساء الإدارات' },
  { key: 'gmoffice', en: 'GM Office', ar: 'مكتب المدير العام', dept: TOP, layer: 0, duties: 'تنسيق جدول المدير العام والاجتماعات\nمتابعة القرارات وتواريخ التنفيذ' },
  { key: 'deputy', en: 'Deputy GM / COO', ar: 'نائب المدير العام', dept: TOP, layer: 0, duties: 'إدارة العمليات اليومية\nمتابعة الإدارات نيابة عن المدير العام' },

  { key: 'com_dir', en: 'Commercial Director', ar: 'المدير التجاري', dept: 'com', layer: 1, suggested: 1, duties: 'الإيراد وهامش الربح والتحصيل\nاعتماد الأسعار داخل الحدود\nتوزيع التارجت ومتابعة الفرص' },
  { key: 'pub', en: 'Tenders & Government Lead', ar: 'مسؤول المناقصات والقطاع الحكومي', dept: 'com', layer: 2, suggested: 1, duties: 'العلاقة مع هيئة الشراء الموحد ووزارة الصحة والجامعات\nقرار دخول المناقصة' },
  { key: 'priv', en: 'Private Hospitals Lead', ar: 'مسؤول المستشفيات الخاصة', dept: 'com', layer: 2, suggested: 1, duties: 'تارجت المستشفيات الخاصة في المناطق\nإدارة مديري المناطق والمناديب' },
  { key: 'homecare', en: 'Homecare Lead', ar: 'مسؤول الرعاية المنزلية', dept: 'com', layer: 2, suggested: 1, duties: 'المريض من الإحالة حتى المتابعة\nبيع وتأجير أجهزة التنفس والنوم' },
  { key: 'kam', en: 'Key Account Manager', ar: 'مدير حسابات رئيسية', dept: 'com', layer: 3, suggested: 1, duties: 'حسابات الجهات الحكومية\nمتابعة الفواتير حتى التحصيل' },
  { key: 'tender', en: 'Tender Desk', ar: 'مكتب المناقصات', dept: 'com', layer: 3, suggested: 1, duties: 'تجهيز ملفات المناقصات\nمتابعة الضمانات ومواعيد التسليم' },
  { key: 'area', en: 'Area Manager', ar: 'مدير منطقة', dept: 'com', layer: 3, suggested: 2, duties: 'إدارة فريق المنطقة وتحقيق التارجت\nزيارة المستشفيات' },
  { key: 'rep', en: 'Sales Rep', ar: 'مندوب مبيعات', dept: 'com', layer: 3, suggested: 3, duties: 'زيارة العملاء وفتح حسابات جديدة\nتسجيل كل زيارة في الـ CRM' },
  { key: 'callctr', en: 'Call Centre Agent', ar: 'موظف مركز الاتصال', dept: 'com', layer: 3, duties: 'استقبال الطلبات والاستفسارات\nمتابعة العملاء المحتملين' },
  { key: 'salesops', en: 'Sales Coordinator', ar: 'منسق مبيعات', dept: 'com', layer: 3, suggested: 1, duties: 'إدخال الطلبات وتحديث الـ CRM\nمتابعة التسليم مع المخازن' },

  { key: 'pc_dir', en: 'Portfolio & Clinical Director', ar: 'مدير المحفظة والشؤون السريرية', dept: 'pc', layer: 1, suggested: 1, duties: 'خطة لكل علامة تجارية مع الموردين\nالتسويق والتدريب الإكلينيكي' },
  { key: 'pm', en: 'Product Manager', ar: 'مدير منتج', dept: 'pc', layer: 2, suggested: 2, duties: 'التوقعات والسعر والمورد لعائلة منتجات\nخطط الإطلاق' },
  { key: 'clin', en: 'Clinical Education Lead', ar: 'مسؤول التدريب الإكلينيكي', dept: 'pc', layer: 2, suggested: 1, duties: 'تدريب الأطباء والتمريض\nبروتوكولات الاستخدام' },
  { key: 'appspec', en: 'Application Specialist', ar: 'أخصائي تطبيقات', dept: 'pc', layer: 3, suggested: 1, duties: 'تشغيل الأجهزة في المستشفيات\nالتدريب الميداني' },
  { key: 'digi', en: 'Marketing & Events', ar: 'التسويق والفعاليات', dept: 'pc', layer: 3, duties: 'الحملات والمحتوى والمؤتمرات' },

  { key: 'svc_head', en: 'Service Head', ar: 'رئيس الصيانة والخدمة', dept: 'svc', layer: 1, suggested: 1, duties: 'كل جهاز مركّب من التركيب حتى الإصلاح\nخطة الصيانة الوقائية' },
  { key: 'inst', en: 'Installation Manager', ar: 'مدير التركيب', dept: 'svc', layer: 2, suggested: 1, duties: 'التركيب والتشغيل\nمحضر الاستلام خلال يومي عمل' },
  { key: 'svc_coord', en: 'Service Coordinator', ar: 'منسق الخدمة', dept: 'svc', layer: 2, suggested: 1, duties: 'تذاكر الصيانة في Odoo\nجدولة الزيارات' },
  { key: 'eng', en: 'Service Engineer', ar: 'مهندس صيانة', dept: 'svc', layer: 3, suggested: 3, duties: 'الصيانة الوقائية والإصلاح\nتقارير الأعطال' },
  { key: 'installer', en: 'Installer', ar: 'فني تركيب', dept: 'svc', layer: 3, duties: 'التركيب والتشغيل الأولي' },

  { key: 'sc_head', en: 'Supply Chain Head', ar: 'رئيس سلسلة الإمداد', dept: 'sc', layer: 1, suggested: 1, duties: 'المخزون المناسب بأقل نقد محتجز\nالاستيراد والتخزين والتوزيع' },
  { key: 'reg', en: 'Regulatory Manager', ar: 'مدير الشؤون التنظيمية', dept: 'sc', layer: 2, suggested: 1, duties: 'تسجيل الأجهزة في هيئة الدواء المصرية\nالشكاوى وبلاغات الأمان' },
  { key: 'planner', en: 'Demand Planner', ar: 'مخطط الطلب', dept: 'sc', layer: 2, suggested: 1, duties: 'خطة الطلب والتوقعات\nاجتماع الإمداد الشهري' },
  { key: 'import', en: 'Import & Customs Officer', ar: 'مسؤول الاستيراد والجمارك', dept: 'sc', layer: 2, suggested: 1, duties: 'الإفراج الجمركي وتصاريح الاستيراد' },
  { key: 'whlead', en: 'Warehouse Lead', ar: 'مسؤول مخزن', dept: 'sc', layer: 2, suggested: 2, duties: 'الاستلام والتخزين والصرف\nالتشغيلة والصلاحية في Odoo' },
  { key: 'whstaff', en: 'Warehouse Staff', ar: 'عامل مخزن', dept: 'sc', layer: 3, duties: 'الاستلام والتجهيز والجرد' },

  { key: 'fin_head', en: 'Finance Head', ar: 'رئيس الإدارة المالية', dept: 'fin', layer: 1, suggested: 1, duties: 'النقد والائتمان ونظام Odoo\nتوقع النقد الأسبوعي' },
  { key: 'acct', en: 'Accounting Lead', ar: 'مسؤول الحسابات', dept: 'fin', layer: 2, suggested: 1, duties: 'الدفاتر والضرائب وإقفال الشهر' },
  { key: 'credit', en: 'Collections Lead', ar: 'مسؤول التحصيل', dept: 'fin', layer: 2, suggested: 1, duties: 'من الفاتورة إلى النقد\nتسوية شهرية مع هيئة الشراء الموحد' },
  { key: 'erp', en: 'Odoo & Data Manager', ar: 'مدير نظام Odoo والبيانات', dept: 'fin', layer: 2, suggested: 1, duties: 'صلاحيات الدخول والتقارير\nلوحات المؤشرات' },
  { key: 'accountant', en: 'Accountant', ar: 'محاسب', dept: 'fin', layer: 3, duties: 'القيود والمطابقات' },
  { key: 'coll', en: 'Collections Officer', ar: 'موظف تحصيل', dept: 'fin', layer: 3, duties: 'متابعة الفواتير المتأخرة' },

  { key: 'ppl_head', en: 'People & Admin Head', ar: 'رئيس الموارد البشرية والشؤون الإدارية', dept: 'ppl', layer: 1, suggested: 1, duties: 'الموارد البشرية والإدارة والقانونية' },
  { key: 'hr', en: 'HR Officer', ar: 'مسؤول موارد بشرية', dept: 'ppl', layer: 2, suggested: 1, duties: 'التوظيف والمرتبات والتأمينات\nتقييم الأداء' },
  { key: 'admin', en: 'Admin & Fleet Coordinator', ar: 'الشؤون الإدارية والحركة', dept: 'ppl', layer: 2, suggested: 1, duties: 'المكاتب والتراخيص\nالعربيات والسواقين' },
  { key: 'legal', en: 'Legal & Contracts', ar: 'الشؤون القانونية والعقود', dept: 'ppl', layer: 2, suggested: 1, duties: 'صياغة ومراجعة العقود\nالنزاعات' },
  { key: 'driver', en: 'Driver', ar: 'سائق', dept: 'ppl', layer: 3, duties: 'توصيل الأجهزة والفريق' },

  { key: 'qa_head', en: 'Quality & Audit Head', ar: 'رئيس الجودة والمراجعة الداخلية', dept: 'qia', layer: 1, suggested: 1, duties: 'نظام الجودة ISO 13485\nخطة المراجعة الداخلية' },
  { key: 'qa_officer', en: 'Quality Officer', ar: 'مسؤول جودة', dept: 'qia', layer: 2, duties: 'وثائق نظام الجودة والإجراءات\nتقييم الموردين' },
  { key: 'auditor', en: 'Internal Auditor', ar: 'مراجع داخلي', dept: 'qia', layer: 2, duties: 'مراجعة المخزون والمستندات والصلاحيات' },
]

const newId = () => crypto.randomUUID()

export function roleFromCatalogue(c: CatalogueRole, dept = c.dept, layer = c.layer): BoardRole {
  return { id: newId(), en: c.en, ar: c.ar, dept, layer, count: c.suggested ?? 1, duties: c.duties }
}

export function emptyBoard(): OrgBoard {
  return { depts: DEFAULT_DEPTS.map((d) => ({ ...d })), roles: [] }
}

export function suggestedBoard(): OrgBoard {
  return {
    depts: DEFAULT_DEPTS.map((d) => ({ ...d })),
    roles: CATALOGUE.filter((c) => c.suggested).map((c) => roleFromCatalogue(c)),
  }
}

// Submissions saved before the board existed hold a different shape; treat those as empty.
export function asBoard(value: unknown): OrgBoard {
  const v = value as Partial<OrgBoard> | null
  if (v && Array.isArray(v.roles) && Array.isArray(v.depts)) return v as OrgBoard
  return emptyBoard()
}

export function headcount(board: OrgBoard) {
  return board.roles.reduce((sum, r) => sum + (Number(r.count) || 0), 0)
}

// Who a role reports to: explicit choice, else the most senior role in the same department above it, else the GM row.
export function managerOf(board: OrgBoard, role: BoardRole): BoardRole | undefined {
  if (role.reportsTo) return board.roles.find((r) => r.id === role.reportsTo)
  const above = board.roles.filter((r) => r.dept === role.dept && r.layer < role.layer).sort((a, b) => b.layer - a.layer)
  if (above.length) return above[0]
  if (role.dept === TOP) return undefined
  return board.roles.find((r) => r.dept === TOP)
}
