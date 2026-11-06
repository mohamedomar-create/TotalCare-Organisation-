// Loads the in-browser fake backend before anything talks to Supabase, only in a demo build.
// In a normal build DEMO is false and the fake backend is never loaded.
export const DEMO = import.meta.env.VITE_DEMO === '1'
export type DemoView = 'invite' | 'staff' | 'distributor' | 'admin'
type DemoApi = { view: () => DemoView; start: () => string; switchTo: (v: DemoView) => void; reset: () => void }
export let demo: DemoApi | null = null
if (DEMO) {
  demo = (await import('./fakeSupabase')).demo as DemoApi
}
export const demoStart = () => demo?.start() ?? '/'
