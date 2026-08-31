import React, { forwardRef, useState } from 'react';
import { Eye, EyeOff, X, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      clearable = false,
      onClear,
      id,
      value,
      disabled,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const isPassword = type === 'password';
    const computedType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
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
          <input
            id={inputId}
            ref={ref}
            type={computedType}
            value={value}
            disabled={disabled}
            className={cn(
              'w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border rounded-xl px-3.5 py-2.5 text-sm transition-all duration-200 placeholder:text-slate-400 dark:placeholder:text-slate-500',
              'focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:focus:border-rose-500',
              'disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed disabled:text-slate-400',
              leftIcon ? 'pl-10' : 'pl-3.5',
              rightIcon || clearable || isPassword ? 'pr-10' : 'pr-3.5',
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20 text-red-900 dark:text-red-300'
                : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600',
              className
            )}
            {...props}
          />
          {clearable && value && !disabled && (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-3 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
          {!isPassword && !clearable && rightIcon && (
            <div className="absolute right-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              {rightIcon}
            </div>
          )}
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

Input.displayName = 'Input';
