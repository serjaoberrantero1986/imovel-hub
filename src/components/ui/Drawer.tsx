import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  position?: 'left' | 'right' | 'bottom';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  className?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  position = 'right',
  size = 'md',
  showCloseButton = true,
  className,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: position === 'bottom' ? 'max-h-[40vh]' : 'max-w-sm',
    md: position === 'bottom' ? 'max-h-[60vh]' : 'max-w-md',
    lg: position === 'bottom' ? 'max-h-[80vh]' : 'max-w-lg',
    xl: position === 'bottom' ? 'max-h-[90vh]' : 'max-w-2xl',
  };

  const positionClasses = {
    right: 'inset-y-0 right-0 animate-in slide-in-from-right duration-250',
    left: 'inset-y-0 left-0 animate-in slide-in-from-left duration-250',
    bottom: 'inset-x-0 bottom-0 rounded-t-3xl animate-in slide-in-from-bottom duration-250',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        className={cn(
          'fixed bg-white dark:bg-slate-900 shadow-2xl border-slate-200 dark:border-slate-800 flex flex-col z-10 text-left',
          position === 'right' && 'border-l',
          position === 'left' && 'border-r',
          position === 'bottom' && 'border-t',
          positionClasses[position],
          sizeClasses[size],
          'w-full',
          className
        )}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between p-6 pb-4 border-b border-slate-100 dark:border-slate-800/80">
            <div className="space-y-1 pr-6">
              {title && (
                <h3 className="text-lg font-bold text-slate-900 dark:text-white font-['Outfit']">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
              )}
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 -mr-2 -mt-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
