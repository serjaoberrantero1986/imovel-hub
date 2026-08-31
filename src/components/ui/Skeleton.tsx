import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular' | 'card';
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  variant = 'rectangular' 
}) => {
  const baseClasses = 'animate-shimmer rounded-xl';
  
  if (variant === 'circular') {
    return <div className={`animate-shimmer rounded-full ${className}`} />;
  }

  if (variant === 'text') {
    return <div className={`animate-shimmer rounded-md h-4 ${className}`} />;
  }

  return <div className={`${baseClasses} ${className}`} />;
};

export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm ${className}`}>
      <Skeleton variant="text" className="w-1/3 h-5" />
      <Skeleton className="h-28 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 4 }) => {
  return (
    <div className="w-full space-y-3 p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="grid grid-cols-4 gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} variant="text" className="h-4 w-3/4" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="grid grid-cols-4 gap-4 py-2">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} variant="text" className="h-4 w-5/6" />
          ))}
        </div>
      ))}
    </div>
  );
};

export const PropertyCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-sm p-0 flex flex-col space-y-3">
      <Skeleton className="aspect-[16/10] w-full rounded-b-none" />
      <div className="p-4 sm:p-5 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          <Skeleton variant="text" className="w-1/3 h-3" />
          <Skeleton variant="text" className="w-4/5 h-5" />
        </div>
        <div className="grid grid-cols-4 gap-2 py-2 border-y border-slate-100 dark:border-slate-800">
          <Skeleton className="h-4" />
          <Skeleton className="h-4" />
          <Skeleton className="h-4" />
          <Skeleton className="h-4" />
        </div>
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="w-24 h-6" />
          <Skeleton className="w-20 h-8 rounded-xl" />
        </div>
      </div>
    </div>
  );
};
