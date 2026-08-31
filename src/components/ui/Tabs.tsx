import React from 'react';
import { cn } from '../../lib/utils';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number | string;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'pills' | 'underline' | 'segment' | 'cards';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'pills',
  size = 'md',
  fullWidth = false,
  className,
}) => {
  const sizeClasses = {
    sm: 'text-xs py-1.5 px-3 gap-1.5',
    md: 'text-sm py-2 px-4 gap-2',
    lg: 'text-base py-2.5 px-5 gap-2.5 font-bold',
  };

  if (variant === 'segment') {
    return (
      <div
        role="tablist"
        className={cn(
          'inline-flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60',
          fullWidth && 'w-full flex',
          className
        )}
      >
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
              className={cn(
                'flex items-center justify-center font-semibold rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
                sizeClasses[size],
                fullWidth && 'flex-1',
                isActive
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              )}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full font-bold',
                    isActive
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === 'underline') {
    return (
      <div
        role="tablist"
        className={cn(
          'flex border-b border-slate-200 dark:border-slate-800 gap-6',
          fullWidth && 'w-full justify-between',
          className
        )}
      >
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
              className={cn(
                'flex items-center gap-2 pb-3 font-semibold text-sm transition-all duration-200 relative cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
                isActive
                  ? 'text-rose-600 dark:text-rose-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              )}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {tab.badge}
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-600 dark:bg-rose-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Default 'pills'
  return (
    <div
      role="tablist"
      className={cn('flex flex-wrap gap-2', fullWidth && 'w-full', className)}
    >
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center justify-center rounded-xl font-semibold transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border',
              sizeClasses[size],
              fullWidth && 'flex-1',
              isActive
                ? 'bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-600/20'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            )}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full font-bold',
                  isActive ? 'bg-rose-700 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
