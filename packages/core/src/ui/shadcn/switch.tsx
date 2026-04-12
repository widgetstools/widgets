import { type InputHTMLAttributes, forwardRef } from 'react';
import { cn } from './utils';

export const Switch = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <label className={cn('relative inline-flex cursor-pointer items-center', className)}>
      <input ref={ref} type="checkbox" className="sr-only peer" {...props} />
      <div className={cn(
        'h-4 w-7 rounded-full border-2 border-transparent transition-colors',
        'bg-muted peer-checked:bg-primary',
        'peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-1',
        'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        'after:absolute after:top-0.5 after:left-0.5 after:h-3 after:w-3',
        'after:rounded-full after:bg-white after:shadow-sm after:transition-transform',
        'peer-checked:after:translate-x-3',
      )} />
    </label>
  )
);
Switch.displayName = 'Switch';
