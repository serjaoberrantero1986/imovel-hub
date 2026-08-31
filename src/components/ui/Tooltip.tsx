import React, { useState } from 'react';
import { cn } from '../../lib/utils';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  delayMs?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  className,
  delayMs = 200,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timer, setTimer] = useState<any>(null);

  const handleMouseEnter = () => {
    const t = setTimeout(() => {
      setIsVisible(true);
    }, delayMs);
    setTimer(t);
  };

  const handleMouseLeave = () => {
    if (timer) clearTimeout(timer);
    setIsVisible(false);
  };

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && content && (
        <div
          role="tooltip"
          className={cn(
            'absolute z-50 px-2.5 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-800 rounded-lg shadow-lg border border-slate-700/50 whitespace-nowrap pointer-events-none animate-in fade-in zoom-in-95 duration-150',
            positionClasses[position],
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
};
