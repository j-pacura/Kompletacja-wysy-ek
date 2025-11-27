import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    console.error('[ErrorBoundary] Caught error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Error details:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center w-screen h-screen bg-bg-primary">
          <div className="max-w-2xl p-8 bg-bg-secondary rounded-2xl border border-accent-error">
            <h1 className="text-3xl font-bold text-accent-error mb-4">
              ⚠️ Błąd aplikacji
            </h1>
            <p className="text-text-primary mb-4">
              Wystąpił nieoczekiwany błąd. Szczegóły poniżej:
            </p>
            <pre className="bg-bg-tertiary p-4 rounded-lg text-text-secondary text-sm overflow-auto max-h-96">
              {this.state.error?.toString()}
              {'\n\n'}
              {this.state.error?.stack}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-3 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors"
            >
              Odśwież aplikację
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
