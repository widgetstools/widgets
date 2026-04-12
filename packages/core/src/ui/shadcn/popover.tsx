import { type ReactNode, useState, useRef, useEffect } from 'react';
import { cn } from './utils';

interface PopoverProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'start' | 'center' | 'end';
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Popover({ trigger, children, align = 'start', className, open: controlledOpen, onOpenChange }: PopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't close when clicking selects, inputs, or options
      if (target.tagName === 'SELECT' || target.tagName === 'INPUT' || target.tagName === 'OPTION') return;
      if (ref.current && !ref.current.contains(target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, setOpen]);

  return (
    <div ref={ref} className="relative inline-flex">
      <div
        onMouseDown={(e) => {
          const tag = (e.target as HTMLElement).tagName;
          if (tag !== 'SELECT' && tag !== 'INPUT' && tag !== 'OPTION') e.preventDefault();
        }}
        onClick={() => setOpen(!open)}
        className="cursor-pointer"
      >
        {trigger}
      </div>
      {open && (
        <div
          className={cn(
            'absolute z-50 top-full mt-1 rounded-md border border-border bg-card shadow-lg',
            align === 'start' && 'left-0',
            align === 'end' && 'right-0',
            align === 'center' && 'left-1/2 -translate-x-1/2',
            className
          )}
          onMouseDown={(e) => {
            const tag = (e.target as HTMLElement).tagName;
            if (tag !== 'SELECT' && tag !== 'INPUT' && tag !== 'OPTION') e.preventDefault();
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
