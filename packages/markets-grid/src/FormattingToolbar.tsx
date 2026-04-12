import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { GridCustomizerCore, GridStore, GridCustomizerStore, CellStyleProperties } from '@grid-customizer/core';
import { Button, Popover, Separator, Tooltip, Select, ColorPickerPopover, cn } from '@grid-customizer/core';
import {
  Undo2, Redo2, Bold, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight,
  Type, PaintBucket,
  Save, Trash2, Grid3X3,
  ChevronDown, ArrowLeft, ArrowRight,
  DollarSign, Percent, Hash,
  Columns3, Rows3,
  PanelTop, PanelBottom, PanelLeft, PanelRight,
  Square, X,
} from 'lucide-react';

// ─── Value Formatter Presets ─────────────────────────────────────────────────

const FORMATTERS: Record<string, { label: string; expr: string }> = {
  USD: { label: '$', expr: "new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(x)" },
  EUR: { label: '\u20AC', expr: "new Intl.NumberFormat('en-US',{style:'currency',currency:'EUR'}).format(x)" },
  GBP: { label: '\u00A3', expr: "new Intl.NumberFormat('en-US',{style:'currency',currency:'GBP'}).format(x)" },
  JPY: { label: '\u00A5', expr: "new Intl.NumberFormat('en-US',{style:'currency',currency:'JPY'}).format(x)" },
  PERCENT: { label: '%', expr: "new Intl.NumberFormat('en-US',{style:'percent',minimumFractionDigits:2}).format(x/100)" },
  COMMA: { label: ',', expr: "new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(x)" },
  BPS: { label: 'bp', expr: "(x>=0?'+':'')+x.toFixed(1)+'bp'" },
};

function makeNumberFmt(decimals: number): string {
  return `new Intl.NumberFormat('en-US',{minimumFractionDigits:${decimals},maximumFractionDigits:${decimals}}).format(x)`;
}

function getDecimalsFromExpr(expr: string | undefined): number | null {
  if (!expr) return null;
  const m = expr.match(/maximumFractionDigits:(\d+)/);
  if (m) return parseInt(m[1], 10);
  const t = expr.match(/toFixed\((\d+)\)/);
  if (t) return parseInt(t[1], 10);
  return null;
}

// ─── Color constants removed — shared ColorPicker in @grid-customizer/core ──

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Toolbar icon button — refined with subtle hover lift */
function TBtn({ children, active, disabled, tooltip, onClick, className }: {
  children: React.ReactNode; active?: boolean; disabled?: boolean;
  tooltip?: string; onClick?: () => void; className?: string;
}) {
  const btn = (
    <Button
      variant="ghost"
      size="icon-sm"
      disabled={disabled}
      className={cn(
        'shrink-0 rounded-[3px] text-[#7a8494] hover:text-[#eaecef] hover:bg-[#2b3139] transition-all duration-150',
        active && 'bg-[#f0b90b]/10 text-[#f0b90b] hover:bg-[#f0b90b]/16 hover:text-[#fcd34d] ring-1 ring-[#f0b90b]/20',
        disabled && 'opacity-20 pointer-events-none',
        className,
      )}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled && onClick) onClick();
      }}
    >
      {children}
    </Button>
  );

  if (tooltip) {
    return <Tooltip content={tooltip}>{btn}</Tooltip>;
  }
  return btn;
}

/** Toolbar group — clusters related tools with a subtle background */
function TGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center gap-[2px] px-[3px] py-[2px] rounded-[4px] bg-[#161a1e]/60', className)}>
      {children}
    </div>
  );
}

// ColorPopover removed — using shared ColorPickerPopover from @grid-customizer/core

// ─── Hooks ───────────────────────────────────────────────────────────────────

function useActiveColumns(core: GridCustomizerCore): string[] {
  const [colIds, setColIds] = useState<string[]>([]);
  const apiRef = useRef<any>(null);
  const lastColIds = useRef<string[]>([]);
  const cleanupRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    let mounted = true;

    const getColIds = (): string[] => {
      const api = apiRef.current ?? core.getGridApi();
      if (!api) return lastColIds.current;
      apiRef.current = api;

      const ids: string[] = [];

      // Use getColId() as the canonical ID — matches col-id attribute in the DOM
      // AND matches colDef.colId ?? colDef.field in transformColumnDefs
      const extractId = (col: any): string | null => {
        if (!col) return null;
        // getColId() returns the definitive AG-Grid column ID
        const colId = typeof col.getColId === 'function' ? col.getColId() : null;
        return colId || null;
      };

      // Try cell ranges first (multi-cell selection)
      try {
        const ranges = api.getCellRanges?.();
        if (ranges?.length > 0) {
          for (const range of ranges) {
            for (const col of (range.columns ?? [])) {
              const id = extractId(col);
              if (id && !ids.includes(id)) ids.push(id);
            }
          }
        }
      } catch { /* */ }

      // Fallback: focused cell
      if (ids.length === 0) {
        try {
          const focused = api.getFocusedCell?.();
          const id = extractId(focused?.column);
          if (id) ids.push(id);
        } catch { /* */ }
      }

      // Don't clear when focus leaves grid (toolbar clicks)
      if (ids.length > 0) {
        lastColIds.current = ids;
        return ids;
      }
      return lastColIds.current;
    };

    const update = () => {
      if (!mounted) return;
      setColIds(getColIds());
    };

    const poll = setInterval(() => {
      const api = core.getGridApi();
      if (!api || !mounted) return;
      apiRef.current = api;
      clearInterval(poll);

      try { api.addEventListener('cellFocused', update); cleanupRef.current.push(() => { try { api.removeEventListener('cellFocused', update); } catch {} }); } catch {}
      try { api.addEventListener('cellClicked', update); cleanupRef.current.push(() => { try { api.removeEventListener('cellClicked', update); } catch {} }); } catch {}
      try { api.addEventListener('cellSelectionChanged', update); cleanupRef.current.push(() => { try { api.removeEventListener('cellSelectionChanged', update); } catch {} }); } catch {}

      update();
    }, 300);

    return () => {
      mounted = false;
      clearInterval(poll);
      for (const fn of cleanupRef.current) fn();
      cleanupRef.current = [];
    };
  }, [core]);

  return colIds;
}

function useColumnFormatting(store: GridStore, colIds: string[], target: 'cell' | 'header' = 'cell'): {
  fontWeight?: string; fontStyle?: string; textDecoration?: string;
  textAlign?: string; color?: string; backgroundColor?: string;
  fontSize?: string; valueFormatter?: string;
  borderTopWidth?: string; borderRightWidth?: string; borderBottomWidth?: string; borderLeftWidth?: string;
  borderTopColor?: string; borderRightColor?: string; borderBottomColor?: string; borderLeftColor?: string;
} {
  const modules = store((s: GridCustomizerStore) => s.modules);
  const colCust = modules['column-customization'] as { assignments: Record<string, any> } | undefined;
  const colTpls = modules['column-templates'] as { templates: Record<string, any> } | undefined;

  return useMemo(() => {
    if (!colIds.length || !colCust) return {};
    const a = colCust.assignments[colIds[0]];
    if (!a) return {};

    // Merge all templates
    const tplIds = a.templateIds ?? (a.templateId ? [a.templateId] : []);
    let mergedCellStyle: any = {};
    let mergedHeaderStyle: any = {};
    let valueFormatter: string | undefined;
    for (const tplId of tplIds) {
      const tpl = colTpls?.templates?.[tplId];
      if (tpl?.cellStyle) mergedCellStyle = { ...mergedCellStyle, ...tpl.cellStyle };
      if (tpl?.headerStyle) mergedHeaderStyle = { ...mergedHeaderStyle, ...tpl.headerStyle };
      if (tpl?.valueFormatterTemplate) valueFormatter = tpl.valueFormatterTemplate;
    }
    // Apply overrides
    if (a.cellStyleOverrides) mergedCellStyle = { ...mergedCellStyle, ...a.cellStyleOverrides };
    if (a.headerStyleOverrides) mergedHeaderStyle = { ...mergedHeaderStyle, ...a.headerStyleOverrides };

    const style = target === 'header' ? mergedHeaderStyle : mergedCellStyle;
    return {
      fontWeight: style?.fontWeight,
      fontStyle: style?.fontStyle,
      textDecoration: style?.textDecoration,
      textAlign: style?.textAlign,
      color: style?.color,
      backgroundColor: style?.backgroundColor,
      fontSize: style?.fontSize,
      valueFormatter: a.valueFormatterTemplate ?? valueFormatter,
      // Border properties for reactive dropdown updates
      borderTopWidth: style?.borderTopWidth,
      borderRightWidth: style?.borderRightWidth,
      borderBottomWidth: style?.borderBottomWidth,
      borderLeftWidth: style?.borderLeftWidth,
      borderTopColor: style?.borderTopColor,
      borderRightColor: style?.borderRightColor,
      borderBottomColor: style?.borderBottomColor,
      borderLeftColor: style?.borderLeftColor,
    };
  }, [colIds, colCust, colTpls]);
}

// ─── Read Helper (fresh from store, not from stale closure) ──────────────────

function getCurrentStyle(store: GridStore, colIds: string[], target: 'cell' | 'header'): CellStyleProperties {
  if (!colIds.length) return {};
  const colCust = store.getState().getModuleState<any>('column-customization');
  const colTpls = store.getState().getModuleState<any>('column-templates');
  const a = colCust?.assignments?.[colIds[0]];
  if (!a) return {};
  const tplIds = a.templateIds ?? (a.templateId ? [a.templateId] : []);
  let merged: CellStyleProperties = {};
  const styleKey = target === 'header' ? 'headerStyle' : 'cellStyle';
  const overrideKey = target === 'header' ? 'headerStyleOverrides' : 'cellStyleOverrides';
  for (const tplId of tplIds) {
    const tpl = colTpls?.templates?.[tplId];
    if (tpl?.[styleKey]) merged = { ...merged, ...tpl[styleKey] };
  }
  if (a[overrideKey]) merged = { ...merged, ...a[overrideKey] };
  return merged;
}

// ─── Write Helpers (write through template system) ───────────────────────────

function getColumnName(core: GridCustomizerCore, colId: string): string {
  try {
    const api = core.getGridApi();
    if (api) {
      const col = (api as any).getColumn?.(colId);
      return col?.getColDef?.()?.headerName ?? colId;
    }
  } catch { /* */ }
  return colId;
}

function ensureTemplateAndAssignment(
  store: GridStore,
  core: GridCustomizerCore,
  colIds: string[],
) {
  // Ensure each column has a template in column-templates and an assignment in column-customization
  store.getState().setModuleState('column-templates', (prev: any) => {
    const templates = { ...prev.templates };
    for (const colId of colIds) {
      const tplId = `${colId}_template`;
      if (!templates[tplId]) {
        const now = Date.now();
        templates[tplId] = {
          id: tplId,
          name: `${getColumnName(core, colId)} Template`,
          description: `Auto-created from toolbar`,
          createdAt: now,
          updatedAt: now,
        };
      }
    }
    return { ...prev, templates };
  });

  store.getState().setModuleState('column-customization', (prev: any) => {
    const assignments = { ...prev.assignments };
    for (const colId of colIds) {
      const tplId = `${colId}_template`;
      if (!assignments[colId]) {
        assignments[colId] = { colId, templateIds: [tplId] };
      } else {
        const existing = assignments[colId].templateIds ?? (assignments[colId].templateId ? [assignments[colId].templateId] : []);
        if (!existing.includes(tplId)) {
          assignments[colId] = { ...assignments[colId], templateIds: [...existing, tplId] };
        }
      }
    }
    return { ...prev, assignments };
  });
}

function applyStyle(store: GridStore, core: GridCustomizerCore, colIds: string[], patch: Partial<CellStyleProperties>) {
  // Push undo point
  const patchKeys = Object.keys(patch).join(', ');
  store.getState().pushUndoPoint(`Style ${patchKeys} on ${colIds.join(', ')}`);

  ensureTemplateAndAssignment(store, core, colIds);

  // Write style to each column's template with updatedAt
  store.getState().setModuleState('column-templates', (prev: any) => {
    const templates = { ...prev.templates };
    const now = Date.now();
    for (const colId of colIds) {
      const a = store.getState().getModuleState<any>('column-customization')?.assignments?.[colId];
      const tplIds = a?.templateIds ?? (a?.templateId ? [a.templateId] : [`${colId}_template`]);
      const tplId = tplIds[tplIds.length - 1]; // Use last (own) template
      const tpl = templates[tplId];
      if (tpl) {
        const merged = { ...tpl.cellStyle, ...patch };
        // Remove keys set to undefined (clearing a property)
        for (const k of Object.keys(merged)) {
          if ((merged as any)[k] === undefined) delete (merged as any)[k];
        }
        templates[tplId] = { ...tpl, cellStyle: merged, updatedAt: now };
      }
    }
    return { ...prev, templates };
  });
}

function applyHeaderStyle(store: GridStore, core: GridCustomizerCore, colIds: string[], patch: Partial<CellStyleProperties>) {
  const patchKeys = Object.keys(patch).join(', ');
  store.getState().pushUndoPoint(`Header style ${patchKeys} on ${colIds.join(', ')}`);

  ensureTemplateAndAssignment(store, core, colIds);

  store.getState().setModuleState('column-templates', (prev: any) => {
    const templates = { ...prev.templates };
    const now = Date.now();
    for (const colId of colIds) {
      const a = store.getState().getModuleState<any>('column-customization')?.assignments?.[colId];
      const tplIds = a?.templateIds ?? (a?.templateId ? [a.templateId] : [`${colId}_template`]);
      const tplId = tplIds[tplIds.length - 1];
      const tpl = templates[tplId];
      if (tpl) {
        const merged = { ...tpl.headerStyle, ...patch };
        for (const k of Object.keys(merged)) {
          if ((merged as any)[k] === undefined) delete (merged as any)[k];
        }
        templates[tplId] = { ...tpl, headerStyle: merged, updatedAt: now };
      }
    }
    return { ...prev, templates };
  });
}

/** Remove specific border keys from ALL templates for given columns — lets AG-Grid theme borders show through */
function clearBorderKeys(
  store: GridStore, core: GridCustomizerCore, colIds: string[],
  keys: string[], target: 'cell' | 'header',
) {
  store.getState().pushUndoPoint(`Clear borders on ${colIds.join(', ')}`);
  ensureTemplateAndAssignment(store, core, colIds);

  store.getState().setModuleState('column-templates', (prev: any) => {
    const templates = { ...prev.templates };
    const now = Date.now();
    for (const colId of colIds) {
      const a = store.getState().getModuleState<any>('column-customization')?.assignments?.[colId];
      const tplIds = a?.templateIds ?? (a?.templateId ? [a.templateId] : [`${colId}_template`]);
      // Strip border keys from EVERY template in the chain
      for (const tplId of tplIds) {
        const tpl = templates[tplId];
        if (!tpl) continue;
        const styleKey = target === 'header' ? 'headerStyle' : 'cellStyle';
        const style = tpl[styleKey];
        if (!style) continue;
        let changed = false;
        const cleaned = { ...style };
        for (const k of keys) {
          if (k in cleaned) { delete (cleaned as any)[k]; changed = true; }
        }
        if (changed) {
          templates[tplId] = { ...tpl, [styleKey]: cleaned, updatedAt: now };
        }
      }
    }
    return { ...prev, templates };
  });
}

const BORDER_KEYS_ALL = [
  'borderTopWidth', 'borderTopStyle', 'borderTopColor',
  'borderRightWidth', 'borderRightStyle', 'borderRightColor',
  'borderBottomWidth', 'borderBottomStyle', 'borderBottomColor',
  'borderLeftWidth', 'borderLeftStyle', 'borderLeftColor',
];

function borderKeysForSide(side: string): string[] {
  return [`border${side}Width`, `border${side}Style`, `border${side}Color`];
}

function applyFormatter(store: GridStore, core: GridCustomizerCore, colIds: string[], expr: string | undefined) {
  store.getState().pushUndoPoint(`Format on ${colIds.join(', ')}`);

  ensureTemplateAndAssignment(store, core, colIds);

  // Write formatter to each column's template with updatedAt
  store.getState().setModuleState('column-templates', (prev: any) => {
    const templates = { ...prev.templates };
    const now = Date.now();
    for (const colId of colIds) {
      const a = store.getState().getModuleState<any>('column-customization')?.assignments?.[colId];
      const tplIds = a?.templateIds ?? (a?.templateId ? [a.templateId] : [`${colId}_template`]);
      const tplId = tplIds[tplIds.length - 1];
      const tpl = templates[tplId];
      if (tpl) {
        templates[tplId] = { ...tpl, valueFormatterTemplate: expr, updatedAt: now };
      }
    }
    return { ...prev, templates };
  });
}

// ─── Main Component ──────────────────────────────────────────────────────────

export interface FormattingToolbarProps {
  core: GridCustomizerCore;
  store: GridStore;
}

export function FormattingToolbar({ core, store }: FormattingToolbarProps) {
  const colIds = useActiveColumns(core);
  const colIdsRef = useRef(colIds);
  colIdsRef.current = colIds;
  const [target, setTarget] = useState<'cell' | 'header'>('cell');
  const targetRef = useRef(target);
  targetRef.current = target;
  const fmt = useColumnFormatting(store, colIds, target);
  const disabled = colIds.length === 0;

  // Style applies to cell or header based on target toggle
  const doStyle = useCallback((patch: Partial<CellStyleProperties>) => {
    const ids = colIdsRef.current;
    if (ids.length > 0) {
      if (targetRef.current === 'header') {
        applyHeaderStyle(store, core, ids, patch);
      } else {
        applyStyle(store, core, ids, patch);
      }
    }
  }, [store, core]);
  const doFormat = useCallback((expr: string | undefined) => {
    const ids = colIdsRef.current;
    if (ids.length > 0) applyFormatter(store, core, ids, expr);
  }, [store, core]);

  // Get column name for display
  const colLabel = useMemo(() => {
    if (colIds.length === 0) return 'Select a cell';
    if (colIds.length === 1) {
      const api = core.getGridApi();
      if (api) {
        try {
          const col = (api as any).getColumn?.(colIds[0]);
          return col?.getColDef?.()?.headerName ?? colIds[0];
        } catch { /* */ }
      }
      return colIds[0];
    }
    return `${colIds.length} columns`;
  }, [colIds, core]);

  // Decimal logic — read fresh from store at click time
  const currentDecimals = getDecimalsFromExpr(fmt.valueFormatter);

  // Helper: get current decimal count from store, falling back to detecting from cell value
  const getCurrentDecimals = useCallback((): number => {
    const ids = colIdsRef.current;
    if (!ids.length) return 2;

    // Check formatter expression first
    const colTpls = store.getState().getModuleState<any>('column-templates');
    const colCust = store.getState().getModuleState<any>('column-customization');
    const a = colCust?.assignments?.[ids[0]];
    let currentFmt = a?.valueFormatterTemplate;
    if (!currentFmt) {
      const tplIds = a?.templateIds ?? (a?.templateId ? [a.templateId] : []);
      for (const tplId of tplIds) {
        const tpl = colTpls?.templates?.[tplId];
        if (tpl?.valueFormatterTemplate) { currentFmt = tpl.valueFormatterTemplate; break; }
      }
    }
    const fromExpr = getDecimalsFromExpr(currentFmt);
    if (fromExpr !== null) return fromExpr;

    // No formatter yet — detect decimals from actual cell value
    try {
      const api = core.getGridApi();
      if (api) {
        const firstRow = (api as any).getDisplayedRowAtIndex?.(0);
        const val = firstRow?.data?.[ids[0]];
        if (typeof val === 'number') {
          const str = String(val);
          const dotIdx = str.indexOf('.');
          return dotIdx >= 0 ? str.length - dotIdx - 1 : 0;
        }
      }
    } catch { /* */ }
    return 2; // safe default
  }, [store, core]);

  const decreaseDecimals = useCallback(() => {
    if (!colIdsRef.current.length) return;
    const d = getCurrentDecimals();
    doFormat(makeNumberFmt(Math.max(0, d - 1)));
  }, [getCurrentDecimals, doFormat]);

  const increaseDecimals = useCallback(() => {
    if (!colIdsRef.current.length) return;
    const d = getCurrentDecimals();
    doFormat(makeNumberFmt(Math.min(10, d + 1)));
  }, [getCurrentDecimals, doFormat]);

  return (
    <div
      className="flex items-center gap-1.5 h-[38px] px-2.5 shrink-0 border-b border-[#1e2329] text-xs relative z-[10000]"
      style={{ background: 'linear-gradient(180deg, #131720 0%, #0f1318 100%)' }}
      onMouseDown={(e) => {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== 'SELECT' && tag !== 'INPUT' && tag !== 'OPTION') e.preventDefault();
      }}
    >
      {/* ── History ── */}
      <TGroup>
        <TBtn tooltip="Undo" disabled={store((s) => s.undoStack.length) === 0}
          onClick={() => store.getState().undo()}>
          <Undo2 size={13} strokeWidth={1.5} />
        </TBtn>
        <TBtn tooltip="Redo" disabled={store((s) => s.redoStack.length) === 0}
          onClick={() => store.getState().redo()}>
          <Redo2 size={13} strokeWidth={1.5} />
        </TBtn>
      </TGroup>

      {/* ── Column context ── */}
      <div className="flex items-center gap-1 px-2 py-1 rounded-[4px] bg-[#161a1e]/60 shrink-0">
        <span
          className={cn(
            'text-[10px] font-mono tracking-wider max-w-[110px] overflow-hidden text-ellipsis whitespace-nowrap select-none transition-colors',
            colIds.length > 0 ? 'text-[#eaecef]' : 'text-[#7a8494]',
          )}
          title={colIds.join(', ')}
        >
          {colLabel}
        </span>
        <button
          className={cn(
            'flex items-center gap-[3px] px-1.5 py-[2px] rounded-[3px] text-[8px] font-mono font-bold tracking-[0.08em] uppercase transition-all duration-150 cursor-pointer',
            target === 'header'
              ? 'bg-[#f0b90b]/15 text-[#f0b90b] ring-1 ring-[#f0b90b]/25'
              : 'bg-[#2b3139]/80 text-[#7a8494] hover:text-[#a0a8b4] hover:bg-[#2b3139]',
          )}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setTarget(target === 'cell' ? 'header' : 'cell'); }}
        >
          {target === 'cell' ? 'CELL' : 'HDR'}
        </button>
      </div>

      <div className="w-px h-5 bg-[#1e2329] shrink-0" />

      {/* ── Number Format ── */}
      <TGroup>
        <Popover
          trigger={
            <Button variant="ghost" size="icon-sm" disabled={disabled}
              className={cn('shrink-0 rounded-[3px] text-[#7a8494] hover:text-[#eaecef] hover:bg-[#2b3139] transition-all duration-150', disabled && 'opacity-20 pointer-events-none')}
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}>
              <DollarSign size={13} strokeWidth={1.5} />
            </Button>
          }
        >
          <div className="p-1.5 min-w-[120px]">
            {Object.entries(FORMATTERS).filter(([k]) => ['USD', 'EUR', 'GBP', 'JPY'].includes(k)).map(([key, f]) => (
              <button
                key={key}
                className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-[3px] text-[11px] text-[#eaecef] hover:bg-[#2b3139] cursor-pointer transition-colors"
                onClick={() => doFormat(f.expr)}
                onMouseDown={(e) => e.preventDefault()}
              >
                <span className="font-mono font-semibold w-4 text-[#7a8494]">{f.label}</span>
                <span>{key}</span>
              </button>
            ))}
          </div>
        </Popover>
        <TBtn disabled={disabled} tooltip="Percentage"
          active={fmt.valueFormatter?.includes('percent')}
          onClick={() => doFormat(fmt.valueFormatter?.includes('percent') ? undefined : FORMATTERS.PERCENT.expr)}>
          <Percent size={12} strokeWidth={1.5} />
        </TBtn>
        <TBtn disabled={disabled} tooltip="Thousands"
          active={fmt.valueFormatter?.includes('maximumFractionDigits:0')}
          onClick={() => doFormat(fmt.valueFormatter?.includes('maximumFractionDigits:0') ? undefined : FORMATTERS.COMMA.expr)}>
          <Hash size={12} strokeWidth={1.5} />
        </TBtn>
        <div className="w-px h-4 bg-[#2b3139]/50" />
        <TBtn disabled={disabled} tooltip="Fewer decimals" onClick={decreaseDecimals}>
          <span className="flex items-center gap-px text-[9px] font-mono"><ArrowLeft size={9} strokeWidth={2} />.0</span>
        </TBtn>
        <TBtn disabled={disabled} tooltip="More decimals" onClick={increaseDecimals}>
          <span className="flex items-center gap-px text-[9px] font-mono">.0<ArrowRight size={9} strokeWidth={2} /></span>
        </TBtn>
      </TGroup>

      <div className="w-px h-5 bg-[#1e2329] shrink-0" />

      {/* ── Typography ── */}
      <TGroup>
        <TBtn disabled={disabled} tooltip="Bold" active={fmt.fontWeight === 'bold' || fmt.fontWeight === '700' || fmt.fontWeight === '900'}
          onClick={() => {
            const cur = getCurrentStyle(store, colIdsRef.current, targetRef.current);
            const isBold = cur.fontWeight === 'bold' || cur.fontWeight === '700' || cur.fontWeight === '900';
            doStyle({ fontWeight: isBold ? 'normal' : '700' });
          }}>
          <Bold size={13} strokeWidth={2.5} />
        </TBtn>
        <TBtn disabled={disabled} tooltip="Italic" active={fmt.fontStyle === 'italic'}
          onClick={() => {
            const cur = getCurrentStyle(store, colIdsRef.current, targetRef.current);
            doStyle({ fontStyle: cur.fontStyle === 'italic' ? undefined : 'italic' });
          }}>
          <Italic size={13} strokeWidth={1.5} />
        </TBtn>
        <TBtn disabled={disabled} tooltip="Underline" active={fmt.textDecoration === 'underline'}
          onClick={() => {
            const cur = getCurrentStyle(store, colIdsRef.current, targetRef.current);
            doStyle({ textDecoration: cur.textDecoration === 'underline' ? undefined : 'underline' });
          }}>
          <Underline size={13} strokeWidth={1.5} />
        </TBtn>
        <div className="w-px h-4 bg-[#2b3139]/50" />
        <ColorPickerPopover disabled={disabled} value={fmt.color} icon={<Type size={11} strokeWidth={2} />}
          onChange={(c) => doStyle({ color: c })} compact />
        <ColorPickerPopover disabled={disabled} value={fmt.backgroundColor} icon={<PaintBucket size={11} strokeWidth={1.5} />}
          onChange={(c) => doStyle({ backgroundColor: c })} compact />
      </TGroup>

      <div className="w-px h-5 bg-[#1e2329] shrink-0" />

      {/* ── Alignment ── */}
      <TGroup>
        <TBtn disabled={disabled} tooltip="Left" active={fmt.textAlign === 'left'}
          onClick={() => doStyle({ textAlign: fmt.textAlign === 'left' ? undefined : 'left' })}>
          <AlignLeft size={13} strokeWidth={1.5} />
        </TBtn>
        <TBtn disabled={disabled} tooltip="Center" active={fmt.textAlign === 'center'}
          onClick={() => doStyle({ textAlign: fmt.textAlign === 'center' ? undefined : 'center' })}>
          <AlignCenter size={13} strokeWidth={1.5} />
        </TBtn>
        <TBtn disabled={disabled} tooltip="Right" active={fmt.textAlign === 'right'}
          onClick={() => doStyle({ textAlign: fmt.textAlign === 'right' ? undefined : 'right' })}>
          <AlignRight size={13} strokeWidth={1.5} />
        </TBtn>
      </TGroup>

      <div className="w-px h-5 bg-[#1e2329] shrink-0" />

      {/* ── Font Size ── */}
      <Popover
        trigger={
          <button disabled={disabled}
            className={cn(
              'flex items-center gap-1 px-2 py-[3px] rounded-[4px] bg-[#161a1e]/60 text-[10px] font-mono text-[#7a8494] hover:text-[#eaecef] hover:bg-[#2b3139]/80 transition-all duration-150 cursor-pointer',
              disabled && 'opacity-20 pointer-events-none',
            )}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}>
            <span className="tracking-wider">{fmt.fontSize ?? '11px'}</span>
            <ChevronDown size={9} strokeWidth={2} className="opacity-50" />
          </button>
        }
      >
        <div className="p-1.5 min-w-[68px]">
          {['9px', '10px', '11px', '12px', '13px', '14px', '16px', '18px', '20px', '24px'].map((sz) => (
            <button
              key={sz}
              className={cn(
                'flex items-center w-full px-2.5 py-1 rounded-[3px] text-[11px] font-mono hover:bg-[#2b3139] cursor-pointer transition-colors',
                fmt.fontSize === sz ? 'text-[#f0b90b]' : 'text-[#eaecef]',
              )}
              onClick={() => doStyle({ fontSize: sz })}
              onMouseDown={(e) => e.preventDefault()}
            >
              {sz}
            </button>
          ))}
        </div>
      </Popover>

      {/* ── Borders ── */}
      <Popover
        trigger={
          <Button variant="ghost" size="icon-sm" disabled={disabled}
            className={cn('shrink-0 rounded-[3px] text-[#7a8494] hover:text-[#eaecef] hover:bg-[#2b3139] transition-all duration-150', disabled && 'opacity-20 pointer-events-none')}
            onMouseDown={(e) => { e.preventDefault(); }}>
            <Grid3X3 size={13} strokeWidth={1.5} />
          </Button>
        }
      >
        {(() => {
          // Use fmt (reactive from useColumnFormatting) for display state
          const isVisible = (w: string | undefined) => !!w && w !== '0px' && w !== 'none';
          const hasT = isVisible(fmt.borderTopWidth);
          const hasR = isVisible(fmt.borderRightWidth);
          const hasB = isVisible(fmt.borderBottomWidth);
          const hasL = isVisible(fmt.borderLeftWidth);
          const activeColor = (fmt.borderTopColor ?? fmt.borderRightColor ?? fmt.borderBottomColor ?? fmt.borderLeftColor ?? '#a0a8b4') as string;
          const activeWidth = (fmt.borderTopWidth && fmt.borderTopWidth !== '0px' ? fmt.borderTopWidth : fmt.borderRightWidth && fmt.borderRightWidth !== '0px' ? fmt.borderRightWidth : fmt.borderBottomWidth && fmt.borderBottomWidth !== '0px' ? fmt.borderBottomWidth : fmt.borderLeftWidth && fmt.borderLeftWidth !== '0px' ? fmt.borderLeftWidth : '1px') as string;

          const toggleSide = (side: string) => {
            const wK = `border${side}Width` as keyof CellStyleProperties;
            const cs = getCurrentStyle(store, colIdsRef.current, targetRef.current);
            const currentWidth = cs[wK] as string;
            if (currentWidth && currentWidth !== '0px' && currentWidth !== 'none') {
              // Remove border from ALL templates so theme border shows through
              clearBorderKeys(store, core, colIdsRef.current, borderKeysForSide(side), targetRef.current);
            } else {
              doStyle({ [`border${side}Width`]: activeWidth, [`border${side}Style`]: 'solid', [`border${side}Color`]: activeColor });
            }
          };

          const setAllBorders = (w: string) => {
            doStyle({
              borderTopWidth: w, borderTopStyle: 'solid', borderTopColor: activeColor,
              borderRightWidth: w, borderRightStyle: 'solid', borderRightColor: activeColor,
              borderBottomWidth: w, borderBottomStyle: 'solid', borderBottomColor: activeColor,
              borderLeftWidth: w, borderLeftStyle: 'solid', borderLeftColor: activeColor,
            });
          };

          const clearAll = () => {
            clearBorderKeys(store, core, colIdsRef.current, BORDER_KEYS_ALL, targetRef.current);
          };

          // Per-side border data with Lucide icons
          const sideIcons = { Top: PanelTop, Right: PanelRight, Bottom: PanelBottom, Left: PanelLeft };
          const sides = [
            { name: 'Top', has: hasT, w: fmt.borderTopWidth, c: fmt.borderTopColor },
            { name: 'Right', has: hasR, w: fmt.borderRightWidth, c: fmt.borderRightColor },
            { name: 'Bottom', has: hasB, w: fmt.borderBottomWidth, c: fmt.borderBottomColor },
            { name: 'Left', has: hasL, w: fmt.borderLeftWidth, c: fmt.borderLeftColor },
          ];

          return (
            <div
              className="p-2.5 min-w-[260px]"
              onMouseDown={(e) => {
                const tag = (e.target as HTMLElement).tagName;
                if (tag !== 'SELECT' && tag !== 'INPUT' && tag !== 'OPTION') e.preventDefault();
              }}
            >
              {/* Preview box */}
              <div
                className="w-full h-12 bg-background rounded mb-2 flex items-center justify-center text-[9px] text-muted-foreground"
                style={{
                  borderTop: hasT ? `${fmt.borderTopWidth ?? '1px'} ${(fmt as any).borderTopStyle ?? 'solid'} ${fmt.borderTopColor ?? '#7a8494'}` : '1px dashed var(--border)',
                  borderRight: hasR ? `${fmt.borderRightWidth ?? '1px'} ${(fmt as any).borderRightStyle ?? 'solid'} ${fmt.borderRightColor ?? '#7a8494'}` : '1px dashed var(--border)',
                  borderBottom: hasB ? `${fmt.borderBottomWidth ?? '1px'} ${(fmt as any).borderBottomStyle ?? 'solid'} ${fmt.borderBottomColor ?? '#7a8494'}` : '1px dashed var(--border)',
                  borderLeft: hasL ? `${fmt.borderLeftWidth ?? '1px'} ${(fmt as any).borderLeftStyle ?? 'solid'} ${fmt.borderLeftColor ?? '#7a8494'}` : '1px dashed var(--border)',
                }}
              >
                {target === 'header' ? 'HEADER' : 'CELL'} PREVIEW
              </div>

              {/* Per-side controls: toggle | color | width | style */}
              {sides.map(({ name, has, w, c }) => {
                const SideIcon = sideIcons[name as keyof typeof sideIcons];
                const wK = `border${name}Width` as keyof CellStyleProperties;
                const cK = `border${name}Color` as keyof CellStyleProperties;
                const sK = `border${name}Style` as keyof CellStyleProperties;
                return (
                  <div key={name} className="flex items-center gap-1 mb-1">
                    {/* Toggle */}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className={cn(
                        'shrink-0',
                        has ? 'bg-amber-500/12 text-amber-400 hover:bg-amber-500/18' : 'text-muted-foreground hover:text-foreground',
                      )}
                      onClick={() => toggleSide(name)}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <SideIcon size={14} strokeWidth={1.75} />
                    </Button>
                    {/* Label */}
                    <span className="text-[9px] text-muted-foreground w-4 shrink-0">{name[0]}</span>
                    {/* Color */}
                    <label
                      className={cn(
                        'w-[22px] h-[22px] rounded shrink-0 cursor-pointer border border-border relative overflow-hidden',
                        !has && 'opacity-30',
                      )}
                      style={{ background: has ? ((c as string) ?? '#7a8494') : undefined }}
                    >
                      <input
                        type="color"
                        value={(c as string) ?? '#7a8494'}
                        disabled={!has}
                        onChange={(e) => doStyle({ [cK]: e.target.value })}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </label>
                    {/* Width */}
                    <Select
                      className={cn('h-[22px] text-[9px] w-[52px]', !has && 'opacity-30')}
                      disabled={!has}
                      value={(w as string) ?? '1px'}
                      onChange={(e) => doStyle({ [wK]: e.target.value })}
                    >
                      <option value="1px">1px</option>
                      <option value="2px">2px</option>
                      <option value="3px">3px</option>
                      <option value="4px">4px</option>
                    </Select>
                    {/* Style */}
                    <Select
                      className={cn('h-[22px] text-[9px] flex-1', !has && 'opacity-30')}
                      disabled={!has}
                      value={((fmt as any)[`border${name}Style`] as string) ?? 'solid'}
                      onChange={(e) => doStyle({ [sK]: e.target.value })}
                    >
                      <option value="solid">Solid</option>
                      <option value="dashed">Dash</option>
                      <option value="dotted">Dot</option>
                      <option value="double">Double</option>
                    </Select>
                  </div>
                );
              })}

              {/* Quick actions */}
              <div className="flex gap-1.5 mt-2 pt-2 border-t border-border/50">
                <Button variant="outline" size="xs" className="flex-1 text-[9px] gap-1"
                  onClick={() => setAllBorders(activeWidth)} onMouseDown={(e) => e.preventDefault()}>
                  <Square size={10} strokeWidth={2} /> All
                </Button>
                <Button variant="outline" size="xs" className="flex-1 text-[9px] gap-1"
                  onClick={clearAll} onMouseDown={(e) => e.preventDefault()}>
                  <X size={10} strokeWidth={2} /> None
                </Button>
              </div>
            </div>
          );
        })()}
      </Popover>

      {/* ── Spacer ── */}
      <div className="flex-1 min-w-2" />

      {/* ── Actions ── */}
      <TGroup>
        <TBtn tooltip="Clear all styles" onClick={() => {
          // Push undo point so user can recover via Ctrl+Z
          store.getState().pushUndoPoint('Before Clear All');
          store.getState().setModuleState('column-templates', () => ({ templates: {}, typeDefaults: {} }));
          store.getState().setModuleState('column-customization', () => ({ assignments: {} }));
          // Clear all injected CSS rules immediately
          core.cssInjector.clear();
          // AG-Grid caches headerStyle inline results on the DOM. Even when React
          // passes new columnDefs, AG-Grid won't re-evaluate headerStyle for existing
          // columns. We must strip the stale inline styles directly from header elements.
          try {
            const api = core.getGridApi();
            if (api) {
              document.querySelectorAll(`.ag-header-cell`).forEach((el) => {
                const s = (el as HTMLElement).style;
                s.removeProperty('font-weight');
                s.removeProperty('font-style');
                s.removeProperty('font-size');
                s.removeProperty('font-family');
                s.removeProperty('text-decoration');
                s.removeProperty('color');
                s.removeProperty('background-color');
              });
            }
          } catch { /* */ }
        }}>
          <Trash2 size={12} strokeWidth={1.5} />
        </TBtn>
        <TBtn tooltip="Save" onClick={() => {
          try {
            const serialized = core.serializeAll();
            localStorage.setItem(`gc-state:${(core as any).gridId}`, JSON.stringify(serialized));
            store.getState().setDirty(false);
            store.setState({ undoStack: [], redoStack: [] });
          } catch { /* */ }
        }}>
          <Save size={12} strokeWidth={1.5} />
        </TBtn>
      </TGroup>
    </div>
  );
}
