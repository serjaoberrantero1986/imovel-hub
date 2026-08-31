import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  href?: string;
  icon?: React.ReactNode;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  homeClick?: () => void;
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items,
  homeClick,
  className,
}) => {
  return (
    <nav aria-label="Navegação estrutural (Breadcrumb)" className={cn('flex items-center text-xs font-medium text-slate-500 dark:text-slate-400', className)}>
      <ol className="flex items-center flex-wrap gap-1.5">
        <li className="flex items-center">
          {homeClick ? (
            <button
              onClick={homeClick}
              className="flex items-center gap-1 hover:text-rose-600 dark:hover:text-rose-400 transition-colors p-1 rounded-md"
              title="Início"
            >
              <Home className="w-3.5 h-3.5" />
              <span className="sr-only sm:not-sr-only">Início</span>
            </button>
          ) : (
            <span className="flex items-center gap-1">
              <Home className="w-3.5 h-3.5" />
              <span className="sr-only sm:not-sr-only">Início</span>
            </span>
          )}
        </li>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center gap-1.5">
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
              {isLast ? (
                <span
                  className="font-bold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-xs"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : item.onClick ? (
                <button
                  onClick={item.onClick}
                  className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors truncate max-w-[140px]"
                >
                  {item.label}
                </button>
              ) : (
                <span className="truncate max-w-[140px]">{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
