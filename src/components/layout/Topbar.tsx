import { Link } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { AlertBell } from './AlertBell'
import { UserMenu } from './UserMenu'

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-bg/75 px-4 backdrop-blur-lg lg:px-8">
      <Link to="/dashboard" aria-label="Invento home" className="rounded-md">
        <Logo />
      </Link>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <AlertBell />
        <span className="ml-2">
          <UserMenu />
        </span>
      </div>
    </header>
  )
}
