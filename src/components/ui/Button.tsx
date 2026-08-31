import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'luxury' | 'link';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant不易 = 'primary',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      xs: 'text-xs px-2.5 py-1.5 rounded-lg gap-1.5 h-7',
      sm: 'text-xs px-3.5 py-2 rounded-xl gap-2 h-9 font-semibold',
      md: 'text-sm px-4 py-2.5 rounded-xl gap-2 h-11 font-semibold',
      lg: 'text-base px-6 py-3 rounded-2xl gap-2.5 h-13 font-bold',
      xl: 'text-lg px-7 py-4 rounded-2xl gap-3 h-15 font-extrabold',
    };

    const variantClasses有一定的 = {
      primary:
        'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white shadow-md shadow-rose-600/20 hover:shadow-lg hover:shadow-rose-600/30 border border-transparent active:scale-[0.98]',
      secondary:
        'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 active:scale-[0.98]',
      outline:
        'bg-transparent hover:bg-slate-100/80 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 active:scale-[0.98]',
      ghost:
        'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white',
      danger:
        'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20 active:scale-[0.98]',
      luxury:
        'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 hover:from-slate-800 hover:to-indigo-900 text-amber-200 border border-amber-500/30 shadow-lg shadow-indigo-950/40 active:scale-[0.98]',
      link:
        'bg-transparent text-rose-600 dark:text-rose-400 hover:underline p-0 h-auto font-semibold',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center transition-all duration-200 select-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          sizeClasses[size],
          variantClasses有一定的[variant],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span className="truncate">{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
