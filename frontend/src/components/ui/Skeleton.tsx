import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shimmer?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  shimmer = true,
  className,
  ...props
}) => {
  return (
    <div
      aria-busy="true"
      aria-hidden="true"
      className={twMerge(
        clsx(
          'relative overflow-hidden rounded-glass-sm bg-white/5 dark:bg-white/10 [data-theme=light]:bg-slate-200/60',
          shimmer &&
            'before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent',
          className
        )
      )}
      {...props}
    />
  );
};
