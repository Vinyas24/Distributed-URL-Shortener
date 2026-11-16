import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  level?: 'base' | 'raised' | 'overlay';
  interactive?: boolean;
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ level = 'raised', interactive = false, className, children, ...props }, ref) => {
    const levelClasses = {
      base: 'glass-base',
      raised: 'glass-raised',
      overlay: 'glass-overlay',
    }[level];

    return (
      <div
        ref={ref}
        className={twMerge(
          clsx(
            levelClasses,
            'rounded-glass-lg p-6 transition-all duration-normal',
            interactive &&
              'cursor-pointer hover:-translate-y-1 hover:shadow-glass-overlay active:translate-y-0 active:scale-[0.99]',
            className
          )
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = 'GlassCard';
