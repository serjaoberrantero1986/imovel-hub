import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface DropdownItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
  shortcut?: string;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  className?: string;
  menuWidth?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  align = 'right',
  className,
  menuWidth = 'w-56',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className={cn('relative inline-block text-left', className)}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div
          className={cn(
            'absolute mt-2 z-50 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 animate-in fade-in zoom-in-95 duration-150',
            align === 'right' ? 'right-0' : 'left-0',
            menuWidth
          )}
        >
          {items.map((item, index) => {
            if (item.divider) {
              return (
                <div
                  key={`div-${index}`}
                  className="my-1.5 border-t border-slate-100 dark:border-slate-800"
                />
              );
            }

            return (
              <button
                key={item.id || index}
                type="button"
                disabled={item.disabled}
                onClick={() => {
                  if (!item.disabled && item.onClick) {
                    item.onClick();
                    setIsOpen(false);
                  }
                }}
                className={cn(
                  'w-full text-left px-3.5 py-2 text-xs sm:text-sm font-medium flex items-center justify-between transition-colors',
                  item.danger
                    ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80',
                  item.disabled && 'opacity-40 cursor-not-allowed'
                )}
              >
                <div className="flex items-center gap-2.5 truncate">
                  {item.icon && <span className="shrink-0">{item.icon}</span>}
                  <span className="truncate">{item.label}</span>
                </div>
                {item.shortcut && (
                  <span className="text-[10px] text-slate-400 font-mono tracking-widest pl-2">
                    {item.shortcut}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
