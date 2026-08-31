import React, { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  showCount?: boolean;
  maxLength?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      showCount = false,
      maxLength,
      id,
      value,
      disabled,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const currentLength = typeof value === 'string' ? value.length : 0;

    return (
      <div className="w-full space-y-1.5 text-left">
        <div className="flex items-center justify-between">
          {label && (
            <label
              htmlFor={inputId}
              className="block text-xs font-bold text-slate-700 dark:text-slate-300 tracking-tight"
            >
              {label}
              {props.required && <span className="text-rose-500 ml-0.5">*</span>}
            </label>
          )}
          {showCount && maxLength && (
            <span className="text-[11px] text-slate-400 font-mono">
              {currentLength}/{maxLength}
            </span>
          )}
        </div>
        <textarea
          id={inputId}
          ref={ref}
          value={value}
          rows={rows}
          maxLength={maxLength}
          disabled={disabled}
          className={cn(
            'w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border rounded-xl p-3.5 text-sm transition-all duration-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-y',
            'focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:focus:border-rose-500',
            'disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed disabled:text-slate-400',
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20 text-red-900 dark:text-red-300'
              : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600',
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-red-500 flex items-center gap-1 mt-1 font-medium">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}
        {!error && helperText && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
