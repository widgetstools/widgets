import { useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { Droplet, Check, Pipette } from 'lucide-react';
import { cn } from './utils';

// ─── Color Palette ──────────────────────────────────────────────────────────
// 10 hue columns × 7 shade rows (row 0 = vivid, rows 1-6 = light→dark)
// Plus a grayscale row at the top. Inspired by DaVinci Resolve / Google Sheets.

const GRAYSCALE = [
  '#ffffff', '#e5e5e5', '#c4c4c4', '#a0a0a0', '#7a7a7a',
  '#545454', '#333333', '#1f1f1f', '#141414', '#000000',
];

const HUE_GRID = [
  // Row 0: vivid (saturated)
  ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899'],
  // Row 1: lighter tints
  ['#fca5a5', '#fdba74', '#fde047', '#86efac', '#5eead4', '#67e8f9', '#93c5fd', '#a5b4fc', '#d8b4fe', '#f9a8d4'],
  // Row 2: pastel
  ['#fecaca', '#fed7aa', '#fef08a', '#bbf7d0', '#99f6e4', '#a5f3fc', '#bfdbfe', '#c7d2fe', '#e9d5ff', '#fbcfe8'],
  // Row 3: very light
  ['#fee2e2', '#ffedd5', '#fef9c3', '#dcfce7', '#ccfbf1', '#cffafe', '#dbeafe', '#e0e7ff', '#f3e8ff', '#fce7f3'],
  // Row 4: mid-dark
  ['#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0d9488', '#0891b2', '#2563eb', '#4f46e5', '#9333ea', '#db2777'],
  // Row 5: dark
  ['#b91c1c', '#c2410c', '#a16207', '#15803d', '#0f766e', '#0e7490', '#1d4ed8', '#4338ca', '#7e22ce', '#be185d'],
  // Row 6: very dark
  ['#991b1b', '#9a3412', '#854d0e', '#166534', '#115e59', '#155e75', '#1e40af', '#3730a3', '#6b21a8', '#9d174d'],
];

const LS_KEY = 'gc-recent-colors';
const MAX_RECENT = 10;

function getRecentColors(): string[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]').slice(0, MAX_RECENT); }
  catch { return []; }
}

function addRecentColor(color: string): void {
  try {
    const recent = getRecentColors().filter(c => c.toLowerCase() !== color.toLowerCase());
    recent.unshift(color);
    localStorage.setItem(LS_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch { /* */ }
}

// ─── Swatch ─────────────────────────────────────────────────────────────────

function Swatch({ color, selected, size = 22, onClick }: {
  color: string; selected: boolean; size?: number; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      title={color}
      className={cn(
        'rounded-[2px] cursor-pointer transition-all duration-75 shrink-0',
        !selected && 'hover:scale-110 hover:z-10 hover:relative',
      )}
      style={{
        width: size, height: size, background: color,
        ...(selected ? { boxShadow: `0 0 0 1.5px var(--card), 0 0 0 3px var(--primary)`, transform: 'scale(1.1)', zIndex: 10, position: 'relative' as const } : undefined),
      }}
    />
  );
}

// ─── ColorPicker ────────────────────────────────────────────────────────────

export interface ColorPickerProps {
  /** Current color value (hex string) */
  value?: string;
  /** Called when a color is confirmed (Apply clicked or swatch double-clicked) */
  onChange: (color: string | undefined) => void;
  /** Show "No Color" / clear option */
  allowClear?: boolean;
  /** Compact mode — smaller swatches */
  compact?: boolean;
}

export function ColorPicker({ value, onChange, allowClear = true, compact = false }: ColorPickerProps) {
  const [draft, setDraft] = useState(value || '');
  const [hexInput, setHexInput] = useState(value || '');
  const [recentColors, setRecentColors] = useState<string[]>(getRecentColors);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync when external value changes
  useEffect(() => {
    setDraft(value || '');
    setHexInput(value || '');
  }, [value]);

  const sz = compact ? 20 : 22;

  const selectColor = useCallback((c: string) => {
    setDraft(c);
    setHexInput(c);
  }, []);

  const confirm = useCallback(() => {
    if (draft) {
      addRecentColor(draft);
      setRecentColors(getRecentColors());
    }
    onChange(draft || undefined);
  }, [draft, onChange]);

  const clear = useCallback(() => {
    setDraft('');
    setHexInput('');
    onChange(undefined);
  }, [onChange]);

  const commitHex = useCallback(() => {
    const hex = hexInput.trim();
    if (/^#?[0-9a-fA-F]{3,8}$/.test(hex)) {
      const normalized = hex.startsWith('#') ? hex : `#${hex}`;
      selectColor(normalized);
    }
  }, [hexInput, selectColor]);

  // Reduced grid: grayscale + rows 0,1,3,4,6 from HUE_GRID (skip rows 2 and 5)
  const filteredHueRows = [HUE_GRID[0], HUE_GRID[1], HUE_GRID[3], HUE_GRID[4], HUE_GRID[6]];

  return (
    <div className="p-3.5" onMouseDown={(e) => {
      if ((e.target as HTMLElement).tagName !== 'INPUT') e.preventDefault();
    }}>
      {/* ── Grayscale row ── */}
      <div className="flex gap-[2px] mb-[2px]">
        {GRAYSCALE.map((c) => (
          <Swatch key={c} color={c} size={sz} selected={draft === c} onClick={() => selectColor(c)} />
        ))}
      </div>

      {/* ── Hue grid (6 rows: grayscale + 5 hue rows) ── */}
      {filteredHueRows.map((row, ri) => (
        <div key={ri} className="flex gap-[2px] mb-[2px]">
          {row.map((c) => (
            <Swatch key={c} color={c} size={sz} selected={draft === c} onClick={() => selectColor(c)} />
          ))}
        </div>
      ))}

      {/* ── Recent colors ── */}
      {recentColors.length > 0 && (
        <div className="mt-3 pt-2.5" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="text-[8px] uppercase tracking-[0.12em] mb-1.5 font-medium" style={{ color: 'var(--muted-foreground)' }}>Recent</div>
          <div className="flex gap-[2px]">
            {recentColors.map((c) => (
              <Swatch key={c} color={c} size={sz} selected={draft === c} onClick={() => selectColor(c)} />
            ))}
          </div>
        </div>
      )}

      {/* ── Bottom: hex input + preview + native picker + actions ── */}
      <div className="flex items-center gap-2.5 mt-3.5 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
        {/* Native color picker trigger — shows current color + eyedropper icon */}
        <label
          className="w-7 h-7 rounded-[4px] shrink-0 cursor-pointer relative overflow-hidden flex items-center justify-center group/picker"
          style={{ background: draft || 'var(--card)', border: '1px solid var(--border)' }}
          title="Pick custom color"
        >
          <Pipette size={11} strokeWidth={1.5} className="transition-colors drop-shadow-sm" style={{ color: 'var(--muted-foreground)' }} />
          <input
            type="color"
            value={draft || '#000000'}
            onChange={(e) => selectColor(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </label>

        {/* Hex input */}
        <input
          ref={inputRef}
          type="text"
          value={hexInput}
          onChange={(e) => setHexInput(e.target.value)}
          onBlur={commitHex}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { commitHex(); confirm(); }
          }}
          placeholder="#000000"
          className="flex-1 h-7 px-2 rounded-[4px] text-[11px] font-mono min-w-0"
          style={{ background: 'var(--background)', color: 'var(--foreground)', border: '1px solid var(--border)', outline: 'none' }}
        />

        {/* No color — prominent clear button */}
        {allowClear && (
          <button
            onClick={clear}
            onMouseDown={(e) => e.preventDefault()}
            className="h-7 px-2 rounded-[4px] shrink-0 cursor-pointer transition-all flex items-center justify-center gap-1.5"
            style={{ background: 'color-mix(in srgb, var(--destructive) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--destructive) 25%, transparent)' }}
            title="No color"
          >
            <Droplet size={11} strokeWidth={2} style={{ color: 'var(--destructive)' }} />
            <span className="text-[9px] font-medium tracking-wide" style={{ color: 'var(--destructive)' }}>Clear</span>
          </button>
        )}

        {/* Confirm */}
        <button
          onClick={confirm}
          onMouseDown={(e) => e.preventDefault()}
          className="h-7 w-7 rounded-[4px] shrink-0 transition-all cursor-pointer flex items-center justify-center"
          style={draft ? { background: 'var(--primary)', color: 'var(--primary-foreground)' } : { background: 'var(--accent)', color: 'var(--muted-foreground)' }}
          title="Apply color"
        >
          <Check size={13} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

// ─── ColorPickerPopover ─────────────────────────────────────────────────────
// Wraps ColorPicker in a Popover with a trigger button.

export interface ColorPickerPopoverProps {
  value?: string;
  onChange: (color: string | undefined) => void;
  /** Trigger content (icon) */
  icon: ReactNode;
  disabled?: boolean;
  allowClear?: boolean;
  compact?: boolean;
}

export function ColorPickerPopover({ value, onChange, icon, disabled, allowClear = true, compact }: ColorPickerPopoverProps) {
  // Import Popover inline to avoid circular deps
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT') return;
      if (ref.current && !ref.current.contains(target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleChange = useCallback((c: string | undefined) => {
    onChange(c);
    setOpen(false);
  }, [onChange]);

  return (
    <div ref={ref} className="relative inline-flex">
      <div
        className="cursor-pointer"
        onMouseDown={(e) => {
          const tag = (e.target as HTMLElement).tagName;
          if (tag !== 'INPUT') e.preventDefault();
        }}
        onClick={() => setOpen(!open)}
      >
        <button
          disabled={disabled}
          className={cn(
            'shrink-0 rounded-[3px] gc-tbtn transition-all duration-150 inline-flex items-center justify-center w-6 h-6',
            disabled && 'opacity-25 pointer-events-none',
          )}
        >
          <span className="flex flex-col items-center gap-[1px]">
            {icon}
            <span
              className="w-3.5 h-[2.5px] rounded-full transition-colors"
              style={{ background: value || 'var(--muted-foreground)' }}
            />
          </span>
        </button>
      </div>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 rounded-lg shadow-lg"
          style={{ border: '1px solid var(--border)', background: 'var(--card)' }}>
          <ColorPicker
            value={value}
            onChange={handleChange}
            allowClear={allowClear}
            compact={compact}
          />
        </div>
      )}
    </div>
  );
}
