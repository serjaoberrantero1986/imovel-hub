import React from 'react';
import { Info, CheckCircle2, AlertTriangle, XCircle, X, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error' | 'luxury';
  title?: React.ReactNode;
  icon?: React.ReactNode;
  onDismiss?: () => void;
  action?: React.ReactNode;
}

export const Alert: React.FC<AlertProps> = ({
  className,
  variant = 'info',
  title,
  icon,
  onDismiss,
  action,
  children,
  ...props
}) => {
  const defaultIcons = {
    info: <Info className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />,
    error: <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />,
    luxury: <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />,
  };

  const variantStyles = {
    info: 'bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 border-sky-200 dark:border-sky-800/60',
    success: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/60',
    warning: 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800/60',
    error: 'bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 border-red-200 dark:border-red-800/60',
    luxury: 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-amber-100 border-amber-500/30 shadow-md',
  };

  return (
    <div
      role="alert"
      className={cn(
        'p-4 rounded-2xl border flex items-start gap-3 transition-all duration-200 text-left',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {icon || defaultIcons[variant]}
      <div className="flex-1 min-w-0">
        {title && (
          <h5 className="font-bold text-sm leading-tight mb-1 font-['Outfit']">{title}</h5>
        )}
        <div className="text-xs leading-relaxed opacity-90">{children}</div>
        {action && <div className="mt-3">{action}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-lg opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
