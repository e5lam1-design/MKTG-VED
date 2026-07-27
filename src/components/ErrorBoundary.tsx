import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#05070a] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-[#0a0d14] border border-rose-500/30 rounded-3xl p-8 max-w-xl w-full shadow-2xl flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertCircle size={36} />
            </div>
            <h2 className="text-2xl font-black text-white arabic-text">حدث خطأ أدى لتوقف الصفحة</h2>
            <p className="text-xs text-muted/70 arabic-text leading-relaxed">
              تم رصد الخطأ بدلاً من إغلاق الشاشة. يرجى الضغط على زر إعادة التحميل لمتابعة العمل:
            </p>
            <div className="bg-black/50 border border-white/10 rounded-xl p-4 w-full text-right text-xs font-mono text-rose-300 overflow-x-auto max-h-40">
              {this.state.error?.toString()}
            </div>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null, errorInfo: null });
                window.location.reload();
              }}
              className="mt-2 bg-purple-600 hover:bg-purple-500 text-white font-black text-sm px-6 py-3 rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-purple-600/30"
            >
              <RefreshCw size={16} />
              <span>إعادة تحميل الصفحة (Reload)</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
