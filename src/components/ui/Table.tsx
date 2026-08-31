import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export const Table = forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative w-full overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
      <table
        ref={ref}
        className={cn('w-full caption-bottom text-sm text-left', className)}
        {...props}
      >
        {children}
      </table>
    </div>
  )
);
Table.displayName = 'Table';

export const TableHeader = forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, children, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn('bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs uppercase font-bold text-slate-600 dark:text-slate-400 tracking-wider', className)}
    {...props}
  >
    {children}
  </thead>
));
TableHeader.displayName = 'TableHeader';

export const TableBody = forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, children, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn('divide-y divide-slate-100 dark:divide-slate-800/80 font-normal', className)}
    {...props}
  >
    {children}
  </tbody>
));
TableBody.displayName = 'TableBody';

export const TableFooter = forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, children, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn('bg-slate-50/80 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 font-semibold', className)}
    {...props}
  >
    {children}
  </tfoot>
));
TableFooter.displayName = 'TableFooter';

export const TableRow = forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, children, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        'hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors duration-150',
        className
      )}
      {...props}
    >
      {children}
    </tr>
  )
);
TableRow.displayName = 'TableRow';

export const TableHead = forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, children, ...props }, ref) => (
  <th
    ref={ref}
    className={cn('h-11 px-4 text-left align-middle font-bold text-slate-700 dark:text-slate-300', className)}
    {...props}
  >
    {children}
  </th>
));
TableHead.displayName = 'TableHead';

export const TableCell = forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, children, ...props }, ref) => (
  <td
    ref={ref}
    className={cn('p-4 align-middle text-slate-700 dark:text-slate-300', className)}
    {...props}
  >
    {children}
  </td>
));
TableCell.displayName = 'TableCell';

export const TableEmpty: React.FC<{ message?: string; icon?: React.ReactNode }> = ({
  message = 'Nenhum registro encontrado',
  icon,
}) => (
  <tr>
    <td colSpan={100} className="p-8 text-center text-slate-400 dark:text-slate-500">
      {icon && <div className="flex justify-center mb-2">{icon}</div>}
      <p className="text-sm font-medium">{message}</p>
    </td>
  </tr>
);
