import React from 'react';
import { AlertTriangle, RefreshCw, Home, X } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[ErrorBoundary:${this.props.name || 'Global'}] Caught render error:`, error, errorInfo);
    this.setState({ errorInfo });
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function'
          ? this.props.fallback({ error: this.state.error, reset: this.handleReset })
          : this.props.fallback;
      }

      const isModal = this.props.isModal;

      if (isModal) {
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
            <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-200 p-6 space-y-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 mx-auto flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  ไม่สามารถเปิดหน้าต่างนี้ได้
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  เกิดข้อผิดพลาดในการประมวลผลข้อมูลของรายการนี้ ({this.state.error?.message || 'Unexpected Error'})
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  ลองใหม่อีกครั้ง
                </button>
                {this.props.onClose && (
                  <button
                    type="button"
                    onClick={this.props.onClose}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    ปิดหน้าต่าง
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="w-full min-h-[360px] flex items-center justify-center p-6">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm text-center space-y-4 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 mx-auto flex items-center justify-center shadow-2xs">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                เกิดข้อผิดพลาดในการแสดงผล
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                ระบบไม่สามารถแสดงผลส่วนนี้ได้เนื่องจากข้อมูลบางส่วนไม่สมบูรณ์
              </p>
              {this.state.error && (
                <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-left overflow-x-auto max-h-28 text-[11px] font-mono text-slate-600 custom-scrollbar">
                  {String(this.state.error.message || this.state.error)}
                </div>
              )}
            </div>
            <div className="flex items-center justify-center gap-2.5 pt-2 flex-wrap">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>โหลดใหม่อีกครั้ง</span>
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold shadow-2xs transition-all cursor-pointer"
              >
                รีเฟรชหน้าเว็บ
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
