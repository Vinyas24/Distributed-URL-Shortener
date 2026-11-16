import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'accent';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  className,
  children,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center font-medium rounded-full backdrop-blur-md transition-colors';

  const sizeClasses = {
    sm: 'px-2.5 py-0.5 text-[11px] leading-4',
    md: 'px-3 py-1 text-xs leading-4',
  }[size];

  const variantClasses = {
    default:
      'bg-white/10 text-slate-200 border border-white/15 [data-theme=light]:bg-slate-900/10 [data-theme=light]:text-slate-800',
    success:
      'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 [data-theme=light]:text-emerald-700',
    warning:
      'bg-amber-500/15 text-amber-300 border border-amber-500/30 [data-theme=light]:text-amber-700',
    danger:
      'bg-rose-500/15 text-rose-300 border border-rose-500/30 [data-theme=light]:text-rose-700',
    accent:
      'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 [data-theme=light]:text-indigo-700',
  }[variant];

  return (
    <span className={twMerge(clsx(baseClasses, sizeClasses, variantClasses, className))} {...props}>
      {children}
    </span>
  );
};
