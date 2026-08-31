import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'neutral'
    | 'primary'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'luxury'
    | 'sale'
    | 'rent'
    | 'launch'
    | 'exclusive'
    | 'verified'
    | 'featured'
    | 'pending'
    | 'draft';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  pill?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'neutral',
  size = 'md',
  dot = false,
  pill = true,
  children,
  ...props
}) => {
  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider',
    md: 'text-xs px-2.5 py-1 font-semibold',
    lg: 'text-sm px-3.5 py-1.5 font-bold',
  };

  const variantClasses = {
    neutral:
      'bg-slate-100 text-slate-700 border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    primary:
      'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/80',
    success:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80',
    warning:
      'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/80',
    danger:
      'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800/80',
    info:
      'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/80',
    luxury:
      'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-amber-200 border-amber-500/30 shadow-sm',
    sale:
      'bg-rose-600 text-white border-transparent shadow-sm',
    rent:
      'bg-indigo-600 text-white border-transparent shadow-sm',
    launch:
      'bg-gradient-to-r from-amber-500 to-rose-600 text-white border-transparent shadow-sm',
    exclusive:
      'bg-amber-500/10 text-amber-700 border-amber-400/30 dark:bg-amber-950/50 dark:text-amber-300',
    verified:
      'bg-emerald-500/10 text-emerald-700 border-emerald-400/30 dark:bg-emerald-950/50 dark:text-emerald-300',
    featured:
      'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300',
    pending:
      'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-200',
    draft:
      'bg-slate-200 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400',
  };

  const dotColorClasses: Record<string, string> = {
    neutral: 'bg-slate-400',
    primary: 'bg-rose-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    info: 'bg-sky-500',
    luxury: 'bg-amber-400',
    sale: 'bg-white',
    rent: 'bg-white',
    launch: 'bg-emerald-300 animate-pulse',
    exclusive: 'bg-amber-500',
    verified: 'bg-emerald-500',
    featured: 'bg-indigo-500',
    pending: 'bg-amber-500',
    draft: 'bg-slate-400',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border whitespace-nowrap select-none transition-colors',
        pill ? 'rounded-full' : 'rounded-lg',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColorClasses[variant] || 'bg-current')}
        />
      )}
      {children}
    </span>
  );
};
