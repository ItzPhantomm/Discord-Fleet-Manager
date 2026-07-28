import { forwardRef } from 'react';
import { cn } from '../utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, asChild, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 ease-spring focus-visible:ring-2 focus-visible:ring-phantom-primary focus-visible:ring-offset-2 focus-visible:ring-offset-phantom-bg disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.96]';
    
    const variants = {
      primary: 'bg-phantom-primary text-phantom-bg hover:bg-phantom-primaryHover',
      secondary: 'bg-phantom-surfaceHover text-phantom-text border border-phantom-border hover:bg-phantom-border hover:border-phantom-borderHover',
      danger: 'bg-phantom-danger text-white hover:bg-phantom-danger/90',
      ghost: 'bg-transparent text-phantom-textMuted hover:bg-phantom-surfaceHover hover:text-phantom-text'
    };
    
    const sizes = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2.5'
    };

    if (asChild) {
      return (
        <button
          ref={ref}
          className={cn(baseStyles, variants[variant], sizes[size], className)}
          disabled={disabled || loading}
          {...props}
        >
          {loading && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>}
          {children}
        </button>
      );
    }

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';