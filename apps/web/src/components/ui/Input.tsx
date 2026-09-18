import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/format';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | undefined;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, className, id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-caption text-text-2">
        {label}
      </label>
      <input
        {...props}
        id={inputId}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          'h-12 w-full rounded-tile border bg-surface px-4 text-[15px] outline-none transition-colors',
          'placeholder:text-text-3',
          error ? 'border-danger' : 'border-line focus:border-grove-500',
          className,
        )}
      />
      {error && (
        <p id={`${inputId}-error`} className="mt-1.5 text-caption text-danger">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${inputId}-hint`} className="mt-1.5 text-caption text-text-3">
          {hint}
        </p>
      )}
    </div>
  );
});
