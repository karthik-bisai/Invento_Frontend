import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface RevealProps {
  children: ReactNode
  /** Stagger offset in ms. */
  delay?: number
  className?: string
}

/** Fades content up once, the first time it scrolls into view. Shows immediately without IntersectionObserver. */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          io.disconnect()
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={ref} data-visible={visible} className={cn('reveal', className)} style={{ '--d': delay } as CSSProperties}>
      {children}
    </div>
  )
}
