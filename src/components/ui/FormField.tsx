import React from 'react';
import { HelpCircle, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Tooltip } from './Tooltip';

export interface FormFieldProps {
  label?: string;
  required?: boolean;
  tooltip?: string;
  error?: string;
  helperText?: string;
  className?: string;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required = false,
  tooltip,
  error,
  helperText,
  className,
  children,
}) => {
  return (
    <div className={cn('space-y-1.5 text-left w-full', className)}>
      {label && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {label}
              {required && <span className="text-rose-500 ml-0.5">*</span>}
            </label>
            {tooltip && (
              <Tooltip content={tooltip} position="top">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer" />
              </Tooltip>
            )}
          </div>
        </div>
      )}

      {children}

      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1 mt-1 font-medium animate-in fade-in duration-150">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {!error && helperText && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
          {helperText}
        </p>
      )}
    </div>
  );
};
