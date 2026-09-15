import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 select-none">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full border border-slate-200 shadow-xl text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-slate-900">
                {this.props.fallbackTitle || 'Unable to display this view'}
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                An unexpected display issue occurred while rendering this card. Your placement portal data is safe.
              </p>
              {this.state.error?.message && (
                <div className="bg-slate-50 text-slate-700 text-[11px] font-mono p-3 rounded-xl border border-slate-200 text-left overflow-x-auto max-h-24">
                  {this.state.error.message}
                </div>
              )}
            </div>

            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center space-x-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Return to Companies</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
