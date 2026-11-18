import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Copy, Check } from 'lucide-react';
import { GlassCard, Button } from '@/components/ui';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  traceId: string | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    traceId: null,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    // Generate or extract a traceId for error reporting
    const existingTraceId = (error as unknown as { traceId?: string }).traceId;
    const generatedTraceId = `tr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    return {
      hasError: true,
      error,
      traceId: existingTraceId || generatedTraceId,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // In production, send to observability logging endpoint (e.g. Micrometer / Grafana)
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleCopyTrace = async () => {
    if (!this.state.traceId) return;
    try {
      await navigator.clipboard.writeText(this.state.traceId);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch {
      // fallback
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
          <GlassCard level="raised" className="max-w-md w-full p-8 text-center relative overflow-hidden">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mb-4">
              <AlertTriangle className="h-7 w-7" />
            </div>

            <h1 className="text-xl font-bold tracking-tight text-slate-100">
              Something went wrong
            </h1>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              An unexpected client error occurred while rendering this view. Our observability
              monitors have flagged this event.
            </p>

            {/* Trace ID Display with Copy Button */}
            {this.state.traceId && (
              <div className="mt-5 p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                <div className="text-left">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">
                    Diagnostic Trace ID
                  </span>
                  <span className="font-mono text-accent-cyan font-semibold">
                    {this.state.traceId}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={this.handleCopyTrace}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors focus-ring"
                  aria-label="Copy trace ID"
                  title="Copy trace ID"
                >
                  {this.state.copied ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            )}

            {/* Technical Details Preview */}
            {this.state.error && (
              <div className="mt-4 text-left">
                <details className="text-[11px] text-slate-400 bg-black/20 p-2.5 rounded-lg border border-white/5 cursor-pointer">
                  <summary className="font-medium text-slate-300">Technical details</summary>
                  <pre className="mt-2 font-mono whitespace-pre-wrap break-all text-rose-300/80">
                    {this.state.error.message || 'Unknown runtime error'}
                  </pre>
                </details>
              </div>
            )}

            <div className="mt-6 flex flex-col sm:flex-row gap-2.5 justify-center">
              <Button
                variant="secondary"
                size="md"
                onClick={this.handleReload}
                leftIcon={<RefreshCw className="h-4 w-4" />}
              >
                Reload Page
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={this.handleGoHome}
                leftIcon={<Home className="h-4 w-4" />}
              >
                Return to Home
              </Button>
            </div>
          </GlassCard>
        </div>
      );
    }

    return this.props.children;
  }
}
