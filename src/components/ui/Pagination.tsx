import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
  onItemsPerPageChange?: (perPage: number) => void;
  showDetails?: boolean;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  onItemsPerPageChange,
  showDetails = true,
  className,
}) => {
  if (totalPages <= 1 && !totalItems) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const delta = 1;

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return pages;
  };

  const startItem = totalItems && itemsPerPage ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem =
    totalItems && itemsPerPage
      ? Math.min(currentPage * itemsPerPage, totalItems)
      : 0;

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-4 py-3 text-xs text-slate-600 dark:text-slate-400',
        className
      )}
    >
      {/* Details info */}
      {showDetails && totalItems !== undefined && (
        <div className="flex items-center gap-3">
          <span>
            Mostrando <strong className="text-slate-900 dark:text-white font-semibold">{startItem}</strong> a{' '}
            <strong className="text-slate-900 dark:text-white font-semibold">{endItem}</strong> de{' '}
            <strong className="text-slate-900 dark:text-white font-semibold">{totalItems}</strong> resultados
          </span>
          {onItemsPerPageChange && (
            <div className="flex items-center gap-1.5 ml-2">
              <span>por pág:</span>
              <select
                value={itemsPerPage}
                onChange={e => onItemsPerPageChange(Number(e.target.value))}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* Pages controls */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => onPageChange(1)}
          aria-label="Primeira página"
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Página anterior"
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1 px-1">
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`dots-${idx}`} className="px-2 text-slate-400">
                  ...
                </span>
              );
            }

            const isCurrent = p === currentPage;
            return (
              <button
                key={`page-${p}`}
                type="button"
                onClick={() => onPageChange(Number(p))}
                className={cn(
                  'w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center transition-all duration-150',
                  isCurrent
                    ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30 font-extrabold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                )}
              >
                {p}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Próxima página"
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(totalPages)}
          aria-label="Última página"
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
