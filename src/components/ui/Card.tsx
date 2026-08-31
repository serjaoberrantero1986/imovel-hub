import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered' | 'glass' | 'interactive';
  hoverEffect?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', hoverEffect = false, children, ...props }, ref) => {
    const variantClasses = {
      default:
        'bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm',
      elevated:
        'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-lg shadow-slate-900/5 dark:shadow-black/40',
      bordered:
        'bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700',
      glass:
        'bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-white/20 dark:border-slate-700/40 shadow-sm',
      interactive:
        'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-slate-900/10 dark:hover:shadow-black/50 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 cursor-pointer',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-2xl overflow-hidden transition-all duration-200',
          variantClasses[variant],
          hoverEffect &&
            'hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/10 dark:hover:shadow-black/40 transition-transform duration-200',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('p-5 sm:p-6 pb-2 sm:pb-3 space-y-1', className)} {...props}>
      {children}
    </div>
  )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        'text-lg font-bold text-slate-900 dark:text-white tracking-tight font-[\'Outfit\']',
        className
      )}
      {...props}
    >
      {children}
    </h3>
  )
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => (
  <p ref={ref} className={cn('text-xs text-slate-500 dark:text-slate-400', className)} {...props}>
    {children}
  </p>
));
CardDescription.displayName = 'CardDescription';

export const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('p-5 sm:p-6 pt-2 sm:pt-3', className)} {...props}>
      {children}
    </div>
  )
);
CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'p-5 sm:p-6 pt-0 border-t border-slate-100 dark:border-slate-800/80 mt-4 flex items-center justify-between',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
CardFooter.displayName = 'CardFooter';
