import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      'relative inline-flex items-center justify-center font-medium transition-all duration-micro select-none focus-ring disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98]';

    const sizeClasses = {
      sm: 'h-10 px-4 text-xs rounded-glass-sm min-w-[44px]',
      md: 'h-12 px-6 text-sm rounded-glass-md min-w-[44px]',
      lg: 'h-14 px-8 text-base rounded-glass-lg min-w-[44px]',
    }[size];

    const variantClasses = {
      primary:
        'bg-gradient-to-r from-accent-indigo via-accent-violet to-accent-coral text-white shadow-glow-coral hover:opacity-95 hover:shadow-lg',
      secondary:
        'glass-raised text-slate-100 dark:text-slate-100 [data-theme=light]:text-slate-800 hover:bg-white/10 dark:hover:bg-white/15',
      ghost:
        'bg-transparent text-slate-300 dark:text-slate-300 [data-theme=light]:text-slate-600 hover:bg-white/5 dark:hover:bg-white/10',
      danger:
        'bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 hover:border-red-500/50',
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={twMerge(clsx(baseClasses, sizeClasses, variantClasses, className))}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
        {!isLoading && leftIcon && <span className="mr-2 inline-flex">{leftIcon}</span>}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="ml-2 inline-flex">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
