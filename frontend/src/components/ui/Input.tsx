import React, { useId } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  isMonospace?: boolean;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      isMonospace = false,
      leftAddon,
      rightAddon,
      id,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className="w-full text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-xs font-medium text-slate-300 dark:text-slate-300 [data-theme=light]:text-slate-700"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftAddon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
              {leftAddon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={twMerge(
              clsx(
                'glass-base h-12 w-full rounded-glass-md px-4 text-sm text-slate-100 placeholder-slate-400/70',
                '[data-theme=light]:text-slate-900 [data-theme=light]:placeholder-slate-500',
                'transition-all duration-micro focus-ring',
                isMonospace && 'font-mono text-xs sm:text-sm tracking-wide',
                leftAddon && 'pl-10',
                rightAddon && 'pr-10',
                error && 'border-red-500/60 focus:border-red-500 focus-visible:outline-red-500',
                disabled && 'opacity-50 cursor-not-allowed',
                className
              )
            )}
            {...props}
          />

          {rightAddon && (
            <div className="absolute right-3.5 flex items-center text-slate-400">
              {rightAddon}
            </div>
          )}
        </div>

        {error && (
          <p id={errorId} role="alert" className="mt-1.5 text-xs font-medium text-red-400">
            {error}
          </p>
        )}

        {!error && helperText && (
          <p id={helperId} className="mt-1.5 text-xs text-slate-400 [data-theme=light]:text-slate-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
