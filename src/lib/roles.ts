import type { Role } from './types'

/** The super admin: every right and every dashboard. Set in the database too (0009). */
export const OWNER_EMAIL = 'mohamed.omar@totalcareegypt.com'
export const isOwner = (email?: string | null) => (email ?? '').trim().toLowerCase() === OWNER_EMAIL

export const ROLE_LABEL: Record<Role, string> = {
  staff: 'Staff',
  management: 'Management',
  distributor: 'Survey admin',
  admin: 'Super admin',
}

export const ROLE_HELP: Record<Role, string> = {
  staff: 'Fills in the survey',
  management: 'Also reads published reports without names',
  distributor: 'Sends the survey to everyone: invitation links, who joined, who hasn’t answered. Sees no answers.',
  admin: 'Everything: results, answers, speak-up inbox, roles',
}

/** Can spread the survey: invitations and coverage. */
export const canDistribute = (role?: Role) => role === 'distributor' || role === 'admin'
