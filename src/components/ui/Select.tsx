import React, { forwardRef } from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: SelectOption[];
  leftIcon?: React.ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      options,
      leftIcon,
      id,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-bold text-slate-700 dark:text-slate-300 tracking-tight"
          >
            {label}
            {props.required && <span className="text-rose-500 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              {leftIcon}
            </div>
          )}
          <select
            id={selectId}
            ref={ref}
            disabled={disabled}
            className={cn(
              'w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border rounded-xl px-3.5 py-2.5 text-sm appearance-none cursor-pointer transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:focus:border-rose-500',
              'disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed disabled:text-slate-400',
              leftIcon ? 'pl-10' : 'pl-3.5',
              'pr-10',
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20 text-red-900 dark:text-red-300'
                : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600',
              className
            )}
            {...props}
          >
            {options
              ? options.map(opt => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="absolute right-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
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

Select.displayName = 'Select';
