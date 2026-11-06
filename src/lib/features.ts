// Switches for whole sections of the app. The survey is the front door; the rest is kept in the code
// and can be turned back on here without losing any data.
export const FEATURES = {
  /** Ideas board, kudos, sectors, points & rewards, announcements, polls */
  community: false,
  /** Read-only org chart and staff directory */
  orgChart: false,
} as const
