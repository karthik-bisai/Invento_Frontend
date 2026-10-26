import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { Button } from './Button'

/** Quick light/dark flip. The full choice, including "follow my device", lives under Settings → Appearance. */
export function ThemeToggle() {
  const { resolved, toggle } = useTheme()
  const dark = resolved === 'dark'
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}>
      <span key={resolved} className="animate-pop grid place-items-center">
        {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </span>
    </Button>
  )
}
