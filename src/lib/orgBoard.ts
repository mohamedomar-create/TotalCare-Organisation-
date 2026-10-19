// The org board: departments as columns, levels as rows, role cards dragged into place.
// Departments and roles are kept general so people can rename them to fit.

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
  { en: 'Owners', ar: 'الملّاك' },
  { en: 'Managing Director', ar: 'العضو المنتدب' },
  { en: 'Managers', ar: 'المديرون' },
  { en: 'Supervisors', ar: 'المشرفون' },
  { en: 'Staff', ar: 'الموظفون' },
]

// These levels are one wide row across all departments (department = TOP).
export const SPAN_LAYERS = [0, 1]
export const FIRST_DEPT_LAYER = 2

export const DEFAULT_DEPTS: BoardDept[] = [
  { id: 'sales', en: 'Sales', ar: 'المبيعات', color: '#1F7A8C' },
  { id: 'mkt', en: 'Marketing', ar: 'التسويق', color: '#3F5FA8' },
  { id: 'fin', en: 'Finance', ar: 'المالية', color: '#6E4FA3' },
  { id: 'hr', en: 'Legal & HR', ar: 'الشؤون القانونية والموارد البشرية', color: '#A24A78' },
  { id: 'qa', en: 'Systems & Quality', ar: 'النظم والجودة', color: '#B23A3A' },
  { id: 'svc', en: 'Service', ar: 'الصيانة', color: '#247A4A' },
  { id: 'pur', en: 'Purchasing', ar: 'المشتريات', color: '#9A5F10' },
]

export const DEPT_COLORS = ['#1F7A8C', '#3F5FA8', '#247A4A', '#9A5F10', '#6E4FA3', '#A24A78', '#B23A3A', '#5C6773', '#2F7F6F', '#8A6D00']

export interface CatalogueRole {
  key: string
  en: string
  ar: string
  dept: string
  layer: number
  suggested?: number // people in the suggested starting board; absent = library only
}

// Ready-made, general job titles people can drag onto the board.
export const CATALOGUE: CatalogueRole[] = [
  { key: 'owners', en: 'Owners / Board', ar: 'الملّاك / مجلس الإدارة', dept: TOP, layer: 0, suggested: 1 },
  { key: 'md', en: 'Managing Director', ar: 'العضو المنتدب', dept: TOP, layer: 1, suggested: 1 },
  { key: 'mdoffice', en: 'MD Office', ar: 'مكتب العضو المنتدب', dept: TOP, layer: 1 },
  { key: 'deputy', en: 'Deputy MD', ar: 'نائب العضو المنتدب', dept: TOP, layer: 1 },

  { key: 'sales_mgr', en: 'Sales Manager', ar: 'مدير المبيعات', dept: 'sales', layer: 2, suggested: 1 },
  { key: 'sales_sup', en: 'Sales Supervisor', ar: 'مشرف مبيعات', dept: 'sales', layer: 3, suggested: 1 },
  { key: 'tender', en: 'Tender Specialist', ar: 'أخصائي مناقصات', dept: 'sales', layer: 4 },
  { key: 'rep', en: 'Sales Rep', ar: 'مندوب مبيعات', dept: 'sales', layer: 4, suggested: 3 },
  { key: 'sales_coord', en: 'Sales Coordinator', ar: 'منسق مبيعات', dept: 'sales', layer: 4 },

  { key: 'mkt_mgr', en: 'Marketing Manager', ar: 'مدير التسويق', dept: 'mkt', layer: 2, suggested: 1 },
  { key: 'product', en: 'Product Specialist', ar: 'أخصائي منتج', dept: 'mkt', layer: 3, suggested: 1 },
  { key: 'app', en: 'Application Specialist', ar: 'أخصائي تطبيقات', dept: 'mkt', layer: 4 },
  { key: 'mkt_exec', en: 'Marketing Executive', ar: 'أخصائي تسويق', dept: 'mkt', layer: 4 },

  { key: 'fin_mgr', en: 'Finance Manager', ar: 'المدير المالي', dept: 'fin', layer: 2, suggested: 1 },
  { key: 'chief_acct', en: 'Chief Accountant', ar: 'رئيس الحسابات', dept: 'fin', layer: 3, suggested: 1 },
  { key: 'acct', en: 'Accountant', ar: 'محاسب', dept: 'fin', layer: 4, suggested: 2 },
  { key: 'coll', en: 'Collector', ar: 'محصّل', dept: 'fin', layer: 4 },

  { key: 'hr_mgr', en: 'Legal & HR Manager', ar: 'مدير الشؤون القانونية والموارد البشرية', dept: 'hr', layer: 2, suggested: 1 },
  { key: 'legal', en: 'Legal Officer', ar: 'موظف شؤون قانونية', dept: 'hr', layer: 4, suggested: 1 },
  { key: 'hr', en: 'HR Specialist', ar: 'أخصائي موارد بشرية', dept: 'hr', layer: 4, suggested: 1 },
  { key: 'admin', en: 'Admin Officer', ar: 'موظف شؤون إدارية', dept: 'hr', layer: 4 },
  { key: 'driver', en: 'Driver', ar: 'سائق', dept: 'hr', layer: 4 },

  { key: 'qa_mgr', en: 'Systems & Quality Manager', ar: 'مدير النظم والجودة', dept: 'qa', layer: 2, suggested: 1 },
  { key: 'it', en: 'IT / Odoo Specialist', ar: 'أخصائي نظم / Odoo', dept: 'qa', layer: 4, suggested: 1 },
  { key: 'qa', en: 'Quality Specialist', ar: 'أخصائي جودة', dept: 'qa', layer: 4, suggested: 1 },
  { key: 'reg', en: 'Regulatory Specialist', ar: 'أخصائي شؤون تنظيمية', dept: 'qa', layer: 4 },

  { key: 'svc_mgr', en: 'Service Manager', ar: 'مدير الصيانة', dept: 'svc', layer: 2, suggested: 1 },
  { key: 'svc_sup', en: 'Service Supervisor', ar: 'مشرف صيانة', dept: 'svc', layer: 3 },
  { key: 'eng', en: 'Service Engineer', ar: 'مهندس صيانة', dept: 'svc', layer: 4, suggested: 3 },
  { key: 'tech', en: 'Technician', ar: 'فني', dept: 'svc', layer: 4 },

  { key: 'pur_mgr', en: 'Purchasing Manager', ar: 'مدير المشتريات', dept: 'pur', layer: 2, suggested: 1 },
  { key: 'wh_sup', en: 'Warehouse Supervisor', ar: 'مشرف مخزن', dept: 'pur', layer: 3, suggested: 1 },
  { key: 'buyer', en: 'Purchasing Specialist', ar: 'أخصائي مشتريات', dept: 'pur', layer: 4, suggested: 1 },
  { key: 'import', en: 'Import Specialist', ar: 'أخصائي استيراد', dept: 'pur', layer: 4 },
  { key: 'wh', en: 'Warehouse Staff', ar: 'موظف مخزن', dept: 'pur', layer: 4 },
]

const newId = () => crypto.randomUUID()

export function roleFromCatalogue(c: CatalogueRole, dept = c.dept, layer = c.layer): BoardRole {
  return { id: newId(), en: c.en, ar: c.ar, dept, layer, count: c.suggested ?? 1, duties: '' }
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

// Who a role reports to: explicit choice, else the nearest role above it in the same department,
// else the nearest role in the top rows (MD, then owners).
export function managerOf(board: OrgBoard, role: BoardRole): BoardRole | undefined {
  if (role.reportsTo) return board.roles.find((r) => r.id === role.reportsTo)
  const nearest = (dept: string) =>
    board.roles.filter((r) => r.dept === dept && r.layer < role.layer).sort((a, b) => b.layer - a.layer)[0]
  return nearest(role.dept) ?? (role.dept === TOP ? undefined : nearest(TOP))
}
