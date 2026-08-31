import React from 'react';
import { cn } from '../../lib/utils';

export interface SwitchProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  id,
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  className,
}) => {
  const switchId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={cn('flex items-center justify-between gap-3 text-left select-none', className)}>
      {(label || description) && (
        <label htmlFor={switchId} className="cursor-pointer">
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
      <button
        type="button"
        id={switchId}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative inline-flex shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2',
          size === 'sm' ? 'h-5 w-9' : 'h-6 w-11',
          checked ? 'bg-rose-600' : 'bg-slate-300 dark:bg-slate-700',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block rounded-full bg-white shadow-md transform ring-0 transition duration-200 ease-in-out',
            size === 'sm' ? 'h-4 w-4 mt-0.5 ml-0.5' : 'h-5 w-5 mt-0.5 ml-0.5',
            checked ? (size === 'sm' ? 'translate-x-4' : 'translate-x-5') : 'translate-x-0'
          )}
        />
      </button>
    </div>
  );
};
