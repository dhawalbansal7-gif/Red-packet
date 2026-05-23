import { useEffect } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
  key?: string;
}

export default function Toast({ toast, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    error: <XCircle className="w-5 h-5 text-rose-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    info: <Info className="w-5 h-5 text-sky-500" />,
  };

  const borderColors = {
    success: 'border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-100',
    error: 'border-rose-500 bg-rose-50/90 dark:bg-rose-950/20 text-rose-900 dark:text-rose-100',
    warning: 'border-amber-500 bg-amber-50/90 dark:bg-amber-950/20 text-amber-900 dark:text-amber-100',
    info: 'border-sky-500 bg-sky-50/90 dark:bg-sky-950/20 text-sky-900 dark:text-sky-100',
  };

  return (
    <div
      className={`flex items-center gap-3 p-4 border-l-4 rounded-r-lg shadow-lg backdrop-blur-md animate-slide-in max-w-sm w-full font-sans transition-all duration-300 ${borderColors[toast.type]}`}
      id={`toast-${toast.id}`}
    >
      <div className="shrink-0">{icons[toast.type]}</div>
      <div className="flex-1 text-sm font-medium pr-2 break-words leading-relaxed">{toast.message}</div>
      <button
        onClick={() => onClose(toast.id)}
        className="shrink-0 hover:opacity-75 transition-opacity"
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
