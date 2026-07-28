import { forwardRef } from 'react';
import { cn } from '../utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', dot, children, ...props }, ref) => {
    const variants = {
      default: 'bg-phantom-border text-phantom-textMuted',
      success: 'bg-phantom-success/20 text-phantom-success',
      warning: 'bg-phantom-warning/20 text-phantom-warning',
      danger: 'bg-phantom-danger/20 text-phantom-danger',
      info: 'bg-phantom-info/20 text-phantom-info',
      neutral: 'bg-phantom-surfaceHover text-phantom-textMuted border border-phantom-border'
    };
    
    const sizes = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-xs'
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 font-medium rounded-full',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {dot && <span className={`w-1.5 h-1.5 rounded-full bg-current`} />}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';