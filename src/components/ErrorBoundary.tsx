import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'

interface State {
  failed: boolean
}

/** Last line of defence: a render crash shows a way forward instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main role="alert" className="grid min-h-screen place-items-center px-6 text-center">
        <div className="max-w-sm">
          <h1 className="font-display text-4xl">Something broke</h1>
          <p className="mt-3 text-sm text-fg-muted">
            The page hit an unexpected error. Reloading usually fixes it, and your data is safe.
          </p>
          <Button variant="primary" className="mt-6" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        </div>
      </main>
    )
  }
}
