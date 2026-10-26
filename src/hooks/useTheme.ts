import { useCallback, useSyncExternalStore } from 'react'

export type ThemeChoice = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

const KEY = 'inventory.theme'
const listeners = new Set<() => void>()

function read(): ThemeChoice {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
  } catch {
    /* storage unavailable */
  }
  return 'system'
}

const prefersDark = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches

let choice: ThemeChoice = read()
const resolve = (c: ThemeChoice): ResolvedTheme => (c === 'system' ? (prefersDark() ? 'dark' : 'light') : c)

function apply() {
  document.documentElement.classList.toggle('dark', resolve(choice) === 'dark')
}

function emit() {
  apply()
  listeners.forEach((l) => l())
}

/** Set the theme from outside React (and in tests). Components should use `useTheme().setTheme`. */
export function setThemeChoice(next: ThemeChoice) {
  setChoice(next)
}

function setChoice(next: ThemeChoice) {
  if (next === choice) return
  choice = next
  try {
    localStorage.setItem(KEY, next)
  } catch {
    /* storage unavailable */
  }
  emit()
}

// "System" has to follow the OS live, and another tab changing the theme should change this one.
if (typeof window !== 'undefined') {
  apply()
  if (typeof window.matchMedia === 'function') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => choice === 'system' && emit())
  }
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      choice = read()
      emit()
    }
  })
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** One shared theme for the whole app, so the top-bar toggle, Settings and the server sync never disagree. */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => choice, () => 'system' as ThemeChoice)
  const resolved = resolve(theme)
  const setTheme = useCallback((t: ThemeChoice) => setChoice(t), [])
  /** Quick flip between light and dark from whatever is showing now. */
  const toggle = useCallback(() => setChoice(resolve(choice) === 'dark' ? 'light' : 'dark'), [])
  return { theme, resolved, setTheme, toggle }
}
