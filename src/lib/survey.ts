// Content for the step-by-step submission. Edit these lists to change the questions.

export const ROLE_LEVELS = ['Team member', 'Senior / specialist', 'Supervisor', 'Manager', 'Director / executive']

export interface RatingDimension {
  key: string
  label: string
  question: string
}

export const RATING_DIMENSIONS: RatingDimension[] = [
  { key: 'clarity', label: 'Role clarity', question: 'I know exactly what is expected of me.' },
  { key: 'structure', label: 'Structure', question: 'The current structure helps me do my job well.' },
  { key: 'communication', label: 'Communication', question: 'Information reaches me on time.' },
  { key: 'workload', label: 'Workload', question: 'My workload is manageable.' },
  { key: 'tools', label: 'Tools & resources', question: 'I have the tools and resources I need.' },
  { key: 'collaboration', label: 'Collaboration', question: 'Teams work well together across departments.' },
  { key: 'leadership', label: 'Leadership support', question: 'I get the support I need from my manager.' },
  { key: 'growth', label: 'Growth', question: 'I can see how to grow my career here.' },
]

export const RATING_SCALE = [
  { value: 1, emoji: '😞', label: 'Strongly disagree' },
  { value: 2, emoji: '🙁', label: 'Disagree' },
  { value: 3, emoji: '😐', label: 'Neutral' },
  { value: 4, emoji: '🙂', label: 'Agree' },
  { value: 5, emoji: '😄', label: 'Strongly agree' },
]

export const RESPONSIBILITY_OPTIONS = [
  'Serving clients / patients',
  'Sales & new business',
  'Account management',
  'Scheduling & coordination',
  'Field operations',
  'Quality & compliance',
  'Purchasing & suppliers',
  'Inventory & logistics',
  'Finance & billing',
  'Payroll & HR admin',
  'Hiring & onboarding',
  'Training others',
  'Reporting & data',
  'IT & systems',
  'Marketing & content',
  'Managing a team',
  'Approvals & sign-off',
  'Customer complaints',
]

export const CHALLENGE_OPTIONS = [
  'Unclear roles / overlap',
  'Too many approvals',
  'Slow decisions',
  'Poor communication between teams',
  'Information arrives late',
  'Workload too high',
  'Not enough staff',
  'Missing tools or systems',
  'Manual, repetitive work',
  'Lack of training',
  'Unclear priorities',
  'Reporting to too many people',
  'Little recognition',
  'Limited career path',
  'Customer issues not escalated',
  'Meetings take too much time',
]

export const MAX_CHALLENGES = 5

export const FEEDBACK_CATEGORIES = [
  { value: 'idea', label: 'Idea', emoji: '💡' },
  { value: 'issue', label: 'Problem', emoji: '⚠️' },
  { value: 'question', label: 'Question', emoji: '❓' },
  { value: 'praise', label: 'Praise', emoji: '👏' },
] as const

export const WIZARD_STEPS = [
  { key: 'about', title: 'About you', hint: '30 seconds' },
  { key: 'pulse', title: 'Quick pulse', hint: 'Tap a face for each' },
  { key: 'role', title: 'Your role', hint: 'Pick what you do' },
  { key: 'challenges', title: 'Challenges', hint: 'Pick up to 5' },
  { key: 'vision', title: 'Draw your vision', hint: 'Use a template or shapes' },
  { key: 'ideas', title: 'Ideas', hint: 'Your top suggestions' },
  { key: 'review', title: 'Review & send', hint: 'Check and submit' },
] as const
