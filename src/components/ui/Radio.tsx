import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  description?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, description, id, disabled, checked, ...props }, ref) => {
    const inputId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="flex items-start gap-3 select-none text-left">
        <div className="relative flex items-center mt-0.5">
          <input
            id={inputId}
            ref={ref}
            type="radio"
            checked={checked}
            disabled={disabled}
            className="peer sr-only"
            {...props}
          />
          <div
            className={cn(
              'w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-200 cursor-pointer',
              'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900',
              'peer-checked:border-rose-600',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-rose-500/30 peer-focus-visible:ring-offset-2',
              disabled && 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800',
              className
            )}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-rose-600 opacity-0 scale-50 peer-checked:opacity-100 peer-checked:scale-100 transition-all duration-150" />
          </div>
        </div>
        {(label || description) && (
          <label htmlFor={inputId} className="cursor-pointer">
            {label && (
              <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                {label}
              </span>
            )}
            {description && (
              <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {description}
              </span>
            )}
          </label>
        )}
      </div>
    );
  }
);

Radio.displayName = 'Radio';
