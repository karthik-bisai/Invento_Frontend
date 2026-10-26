import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void) {
  const cleanups: (() => void)[] = []
  if (typeof window.matchMedia === 'function') {
    const mq = window.matchMedia(QUERY)
    mq.addEventListener?.('change', onChange)
    cleanups.push(() => mq.removeEventListener?.('change', onChange))
  }
  // The "Reduce motion" setting flips a data attribute on <html>; watch it so components react immediately.
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] })
  cleanups.push(() => observer.disconnect())
  return () => cleanups.forEach((c) => c())
}

const snapshot = () =>
  document.documentElement.dataset.motion === 'reduce' ||
  (typeof window.matchMedia === 'function' ? window.matchMedia(QUERY).matches : true) // no matchMedia (tests): treat as reduced

/** True when the user asked for less motion, in the OS or in Settings. */
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, snapshot, () => false)
}
