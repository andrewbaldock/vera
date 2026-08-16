import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * The app's floor. Without one of these, React unmounts the entire tree on any
 * uncaught error and the user is left looking at the background color — content
 * that flashes and then vanishes, with nothing on screen to say why. On a phone
 * or a tablet that is also the end of the investigation, because there is no
 * console to open.
 *
 * So it shows the error rather than swallowing it. That is the right trade for
 * a build someone else is going to run on hardware I do not have: a message I
 * can be sent beats a black screen I have to guess at. In a real product this
 * reports to the error service and shows only the apology.
 *
 * A class, because error boundaries have no hook equivalent — `componentDidCatch`
 * and `getDerivedStateFromError` are the only API React offers for this.
 */
interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // The component stack is the half that says *where*, and it is not on the
    // Error itself.
    console.error('Unhandled error:', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-6">
        <div className="w-full max-w-md">
          <h1 className="text-lg font-semibold tracking-tight">Something broke.</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This is a defect, not something you did. Reloading usually gets you back in.
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 min-h-11 rounded-md border px-3 text-sm font-medium transition-colors hover:bg-accent focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
          >
            Reload
          </button>

          {/* Collapsed, but present: on a tablet this is the only way to read
              what happened, and "send me the text under Details" is a question
              someone can actually answer. */}
          <details className="mt-6">
            <summary className="cursor-pointer text-xs text-muted-foreground">
              Details, for whoever is debugging this
            </summary>
            <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-muted p-3 text-[11px] leading-snug whitespace-pre-wrap">
              {error.name}: {error.message}
              {error.stack ? `\n\n${error.stack}` : ''}
            </pre>
          </details>
        </div>
      </div>
    )
  }
}
