import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught PMS error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleResetData = () => {
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('pharmacare_pms_')) {
          localStorage.removeItem(key);
        }
      });
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl space-y-6 text-center">
            <div className="w-16 h-16 bg-red-500/10 text-red-400 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">Application Recovery Mode</h2>
              <p className="text-xs text-slate-400 mt-2">
                A client-side initialization conflict was encountered. You can reload or reset to clean seed data.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-950 p-4 rounded-xl text-left border border-slate-800 text-xs font-mono text-red-400 overflow-x-auto">
                <p className="font-bold">{this.state.error.toString()}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center space-x-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Page</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetData}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Reset to Clean Database</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
