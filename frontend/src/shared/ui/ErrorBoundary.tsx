import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Last line of defence for render errors: a readable page instead of a blank
 * screen. Data errors are handled by ErrorState inside each view.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled render error", error, info.componentStack);
  }

  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        role="alert"
        className="grid min-h-dvh place-items-center bg-canvas p-6 text-center"
      >
        <div className="max-w-md">
          <h1 className="text-xl font-semibold text-ink">Something went wrong</h1>
          <p className="mt-2 text-sm text-ink-muted">
            The page hit an unexpected problem. Reloading usually fixes it.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex h-10 items-center rounded-control bg-accent px-4 text-sm font-medium text-on-accent hover:bg-accent-hover"
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}
