import React from 'react';
import { cn } from '../../lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'rectangular' | 'circular';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'rectangular',
  width,
  height,
  style,
  ...props
}) => {
  const variantClasses = {
    text: 'h-4 w-full rounded-md',
    rectangular: 'rounded-xl w-full h-full',
    circular: 'rounded-full',
  };

  return (
    <div
      className={cn(
        'animate-shimmer bg-slate-200 dark:bg-slate-800',
        variantClasses[variant],
        className
      )}
      style={{
        width,
        height,
        ...style,
      }}
      {...props}
    />
  );
};

export const PropertyCardSkeleton: React.FC = () => (
  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
    <div className="relative aspect-16/10 w-full animate-shimmer bg-slate-200 dark:bg-slate-800" />
    <div className="p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton variant="text" className="w-24 h-4" />
        <Skeleton variant="text" className="w-16 h-4" />
      </div>
      <Skeleton variant="text" className="w-3/4 h-6" />
      <Skeleton variant="text" className="w-1/2 h-4" />
      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <Skeleton variant="text" className="h-4" />
        <Skeleton variant="text" className="h-4" />
        <Skeleton variant="text" className="h-4" />
        <Skeleton variant="text" className="h-4" />
      </div>
      <div className="pt-2 flex items-center justify-between">
        <Skeleton variant="text" className="w-28 h-7" />
        <Skeleton variant="rectangular" className="w-20 h-8 rounded-lg" />
      </div>
    </div>
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="space-y-3 p-4">
    <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
      <Skeleton variant="text" className="w-32 h-5" />
      <Skeleton variant="rectangular" className="w-24 h-8 rounded-lg" />
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 py-2">
        <Skeleton variant="rectangular" className="w-12 h-12 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-2/3 h-4" />
          <Skeleton variant="text" className="w-1/3 h-3" />
        </div>
        <Skeleton variant="text" className="w-20 h-4" />
        <Skeleton variant="rectangular" className="w-16 h-6 rounded-md" />
      </div>
    ))}
  </div>
);
