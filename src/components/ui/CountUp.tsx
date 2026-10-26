import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface CountUpProps {
  value: number
  format: (n: number) => string
  /** Animation length in ms. */
  duration?: number
}

/** Eases from the previous value to `value`. Snaps straight to it when reduced motion is on. */
export function CountUp({ value, format, duration = 800 }: CountUpProps) {
  const reduced = useReducedMotion()
  const [shown, setShown] = useState(reduced ? value : 0)
  const from = useRef(reduced ? value : 0)

  useEffect(() => {
    if (reduced) return
    const start = performance.now()
    const origin = from.current
    let raf = requestAnimationFrame(function tick(now) {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 4) // ease-out quart
      const current = origin + (value - origin) * eased
      from.current = current
      setShown(t === 1 ? value : current)
      if (t < 1) raf = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(raf)
  }, [value, duration, reduced])

  return <>{format(reduced ? value : shown)}</>
}
