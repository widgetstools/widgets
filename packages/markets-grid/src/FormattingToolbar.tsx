import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { GridCustomizerCore, GridStore, GridCustomizerStore, CellStyleProperties } from '@grid-customizer/core';
import { Button, Popover, Separator, Tooltip, Select, ColorPickerPopover, cn } from '@grid-customizer/core';
import {
  Undo2, Redo2, Bold, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight,
  Type, PaintBucket,
  Save, Trash2, Grid3X3, Check,
  ChevronDown, ArrowLeft, ArrowRight,
  DollarSign, Percent, Hash,
  Columns3, Rows3,
  PanelTop, PanelBottom, PanelLeft, PanelRight,
  Square, X, LayoutTemplate, Plus,
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

/** Toolbar icon button — theme-aware via CSS variables */
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
        'shrink-0 w-7 h-7 rounded-[5px] transition-all duration-150 gc-tbtn',
        active && 'gc-tbtn-active',
        disabled && 'opacity-25 pointer-events-none',
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
    <div className={cn('flex items-center gap-[3px] px-1.5 py-1 rounded-[6px]', className)}
      style={{ background: 'color-mix(in srgb, var(--accent) 40%, transparent)' }}>
      {children}
    </div>
  );
}

// ColorPopover removed — using shared ColorPickerPopover from @grid-customizer/core

/** Flash a checkmark icon for 1s after an action, then revert to original icon */
function useFlashConfirm(): [boolean, () => void] {
  const [confirmed, setConfirmed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const flash = useCallback(() => {
    setConfirmed(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setConfirmed(false), 400);
  }, []);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  return [confirmed, flash];
}

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

/** Ensure each column has a ColumnAssignment (but do NOT create auto-templates) */
function ensureAssignment(store: GridStore, colIds: string[]) {
  store.getState().setModuleState('column-customization', (prev: any) => {
    const assignments = { ...prev.assignments };
    let changed = false;
    for (const colId of colIds) {
      if (!assignments[colId]) {
        assignments[colId] = { colId };
        changed = true;
      }
    }
    return changed ? { ...prev, assignments } : prev;
  });
}

/** Apply cell styles as per-column overrides (NOT as templates).
 *  Templates are only created explicitly via "Save As Template". */
function applyStyle(store: GridStore, core: GridCustomizerCore, colIds: string[], patch: Partial<CellStyleProperties>) {
  const patchKeys = Object.keys(patch).join(', ');
  store.getState().pushUndoPoint(`Style ${patchKeys} on ${colIds.join(', ')}`);
  ensureAssignment(store, colIds);

  store.getState().setModuleState('column-customization', (prev: any) => {
    const assignments = { ...prev.assignments };
    for (const colId of colIds) {
      const a = assignments[colId] ?? { colId };
      const merged = { ...(a.cellStyleOverrides ?? {}), ...patch };
      for (const k of Object.keys(merged)) {
        if ((merged as any)[k] === undefined) delete (merged as any)[k];
      }
      assignments[colId] = { ...a, cellStyleOverrides: merged };
    }
    return { ...prev, assignments };
  });
}

/** Apply header styles as per-column overrides */
function applyHeaderStyle(store: GridStore, core: GridCustomizerCore, colIds: string[], patch: Partial<CellStyleProperties>) {
  const patchKeys = Object.keys(patch).join(', ');
  store.getState().pushUndoPoint(`Header style ${patchKeys} on ${colIds.join(', ')}`);
  ensureAssignment(store, colIds);

  store.getState().setModuleState('column-customization', (prev: any) => {
    const assignments = { ...prev.assignments };
    for (const colId of colIds) {
      const a = assignments[colId] ?? { colId };
      const merged = { ...(a.headerStyleOverrides ?? {}), ...patch };
      for (const k of Object.keys(merged)) {
        if ((merged as any)[k] === undefined) delete (merged as any)[k];
      }
      assignments[colId] = { ...a, headerStyleOverrides: merged };
    }
    return { ...prev, assignments };
  });
}

/** Remove specific border keys from per-column overrides — lets AG-Grid theme borders show through */
function clearBorderKeys(
  store: GridStore, core: GridCustomizerCore, colIds: string[],
  keys: string[], target: 'cell' | 'header',
) {
  store.getState().pushUndoPoint(`Clear borders on ${colIds.join(', ')}`);
  ensureAssignment(store, colIds);

  const overrideKey = target === 'header' ? 'headerStyleOverrides' : 'cellStyleOverrides';
  store.getState().setModuleState('column-customization', (prev: any) => {
    const assignments = { ...prev.assignments };
    for (const colId of colIds) {
      const a = assignments[colId] ?? { colId };
      const overrides = { ...(a[overrideKey] ?? {}) };
      for (const k of keys) { delete (overrides as any)[k]; }
      assignments[colId] = { ...a, [overrideKey]: overrides };
    }
    return { ...prev, assignments };
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

/** Apply value formatter as per-column override (NOT as template) */
function applyFormatter(store: GridStore, core: GridCustomizerCore, colIds: string[], expr: string | undefined) {
  store.getState().pushUndoPoint(`Format on ${colIds.join(', ')}`);
  ensureAssignment(store, colIds);

  store.getState().setModuleState('column-customization', (prev: any) => {
    const assignments = { ...prev.assignments };
    for (const colId of colIds) {
      const a = assignments[colId] ?? { colId };
      assignments[colId] = { ...a, valueFormatterTemplate: expr };
    }
    return { ...prev, assignments };
  });
}

/** Apply an existing template to the selected columns */
function applyTemplateToColumns(store: GridStore, core: GridCustomizerCore, colIds: string[], templateId: string) {
  if (!colIds.length || !templateId) return;
  store.getState().pushUndoPoint(`Apply template to ${colIds.join(', ')}`);

  // Ensure each column has an assignment
  store.getState().setModuleState('column-customization', (prev: any) => {
    const assignments = { ...prev.assignments };
    for (const colId of colIds) {
      if (!assignments[colId]) {
        assignments[colId] = { colId, templateIds: [templateId] };
      } else {
        const existing = assignments[colId].templateIds ?? (assignments[colId].templateId ? [assignments[colId].templateId] : []);
        if (!existing.includes(templateId)) {
          assignments[colId] = { ...assignments[colId], templateIds: [...existing, templateId] };
        }
      }
    }
    return { ...prev, assignments };
  });
}

/** Save the current column's resolved styles as a new named template */
function saveCurrentAsTemplate(store: GridStore, core: GridCustomizerCore, colIds: string[], name: string) {
  if (!colIds.length || !name.trim()) return;

  // Read current resolved styles from the first selected column
  const colTpls = store.getState().getModuleState<any>('column-templates');
  const colCust = store.getState().getModuleState<any>('column-customization');
  const a = colCust?.assignments?.[colIds[0]];
  const tplIds = a?.templateIds ?? (a?.templateId ? [a.templateId] : []);

  // Merge all template styles
  let mergedCellStyle: CellStyleProperties = {};
  let mergedHeaderStyle: CellStyleProperties = {};
  let valueFormatterTemplate: string | undefined;

  for (const tplId of tplIds) {
    const tpl = colTpls?.templates?.[tplId];
    if (!tpl) continue;
    if (tpl.cellStyle) mergedCellStyle = { ...mergedCellStyle, ...tpl.cellStyle };
    if (tpl.headerStyle) mergedHeaderStyle = { ...mergedHeaderStyle, ...tpl.headerStyle };
    if (tpl.valueFormatterTemplate) valueFormatterTemplate = tpl.valueFormatterTemplate;
  }

  // Apply per-column overrides
  if (a?.cellStyleOverrides) mergedCellStyle = { ...mergedCellStyle, ...a.cellStyleOverrides };
  if (a?.headerStyleOverrides) mergedHeaderStyle = { ...mergedHeaderStyle, ...a.headerStyleOverrides };
  if (a?.valueFormatterTemplate) valueFormatterTemplate = a.valueFormatterTemplate;

  // Skip if no styles
  const hasCell = Object.keys(mergedCellStyle).length > 0;
  const hasHeader = Object.keys(mergedHeaderStyle).length > 0;
  if (!hasCell && !hasHeader && !valueFormatterTemplate) return;

  const now = Date.now();
  const newId = `tpl_${now}_${Math.random().toString(36).slice(2, 6)}`;
  const newTemplate = {
    id: newId,
    name: name.trim(),
    description: `Saved from ${colIds[0]} column`,
    createdAt: now,
    updatedAt: now,
    ...(hasCell ? { cellStyle: mergedCellStyle } : {}),
    ...(hasHeader ? { headerStyle: mergedHeaderStyle } : {}),
    ...(valueFormatterTemplate ? { valueFormatterTemplate } : {}),
  };

  store.getState().pushUndoPoint(`Save template "${name}"`);
  store.getState().setModuleState('column-templates', (prev: any) => ({
    ...prev,
    templates: { ...prev.templates, [newId]: newTemplate },
  }));

  return newId;
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
  const [clearConfirmed, flashClear] = useFlashConfirm();
  const [saveConfirmed, flashSave] = useFlashConfirm();
  const [saveAsTplConfirmed, flashSaveAsTpl] = useFlashConfirm();
  const [saveAsTplName, setSaveAsTplName] = useState('');

  // Read available templates for the dropdown
  const templates = store((s: GridCustomizerStore) => {
    const tplState = (s.modules as any)?.['column-templates'];
    return (tplState?.templates ?? {}) as Record<string, { id: string; name: string }>;
  });
  const templateList = useMemo(() => Object.values(templates).sort((a, b) => a.name.localeCompare(b.name)), [templates]);

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
      className={cn('flex items-center gap-2 h-[42px] px-3 shrink-0 border-b text-xs relative z-[10000]', !disabled && 'gc-toolbar-enabled')}
      style={{ background: 'var(--card, #161a1e)', borderColor: 'var(--border, #1e2329)' }}
      onMouseDown={(e) => {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== 'SELECT' && tag !== 'INPUT' && tag !== 'OPTION') e.preventDefault();
      }}
    >
      {/* ── Column context + CELL/HDR segmented control ── */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-[6px] shrink-0"
        style={{ border: '1px solid var(--border)' }}>
        <span className="text-[10px] font-mono tracking-wider max-w-[100px] overflow-hidden text-ellipsis whitespace-nowrap select-none"
          style={{ color: colIds.length > 0 ? 'var(--foreground)' : 'var(--muted-foreground)' }}
          title={colIds.join(', ')}>
          {colLabel}
        </span>
        <div className="flex h-6 rounded-[4px] overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <button
            className="px-2 text-[9px] font-semibold tracking-wider uppercase transition-all cursor-pointer"
            style={target === 'cell' ? { background: 'var(--primary)', color: 'var(--primary-foreground)' } : { background: 'transparent', color: 'var(--muted-foreground)' }}
            onMouseDown={(e) => { e.preventDefault(); setTarget('cell'); }}
          >CELL</button>
          <button
            className="px-2 text-[9px] font-semibold tracking-wider uppercase transition-all cursor-pointer"
            style={target === 'header' ? { background: 'var(--primary)', color: 'var(--primary-foreground)' } : { background: 'transparent', color: 'var(--muted-foreground)' }}
            onMouseDown={(e) => { e.preventDefault(); setTarget('header'); }}
          >HDR</button>
        </div>
      </div>

      <div className="gc-toolbar-sep h-5" />

      {/* ── Templates ── */}
      {!disabled && (
        <TGroup>
          <select
            className="h-6 text-[10px] font-mono rounded-[3px] px-1 cursor-pointer transition-all gc-tbtn"
            style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)', maxWidth: 110 }}
            value=""
            onChange={(e) => {
              const tplId = e.target.value;
              if (tplId) {
                applyTemplateToColumns(store, core, colIdsRef.current, tplId);
                e.target.value = ''; // Reset to placeholder
              }
            }}
          >
            <option value="" disabled>Templates</option>
            {templateList.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
            ))}
            {templateList.length === 0 && <option disabled>No templates yet</option>}
          </select>
          <Popover
            trigger={
              <TBtn tooltip="Save as template" className={saveAsTplConfirmed ? 'gc-tbtn-confirm' : undefined}>
                {saveAsTplConfirmed
                  ? <Check size={14} strokeWidth={2.5} style={{ color: 'var(--bn-green, #2dd4bf)' }} />
                  : <Plus size={14} strokeWidth={1.75} />
                }
              </TBtn>
            }
          >
            <div className="p-3.5 w-[230px]" onMouseDown={(e) => {
              if ((e.target as HTMLElement).tagName !== 'INPUT') e.preventDefault();
            }}>
              <div className="text-[9px] uppercase tracking-[0.08em] mb-1.5" style={{ color: 'var(--muted-foreground)' }}>
                Save as template
              </div>
              <input
                type="text"
                value={saveAsTplName}
                onChange={(e) => setSaveAsTplName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && saveAsTplName.trim()) {
                    saveCurrentAsTemplate(store, core, colIdsRef.current, saveAsTplName);
                    setSaveAsTplName('');
                    flashSaveAsTpl();
                  }
                }}
                placeholder={colLabel + ' Style'}
                className="w-full h-7 px-2 rounded-[3px] text-[11px] mb-2"
                style={{ background: 'var(--background)', color: 'var(--foreground)', border: '1px solid var(--border)', outline: 'none' }}
                autoFocus
              />
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  const name = saveAsTplName.trim() || `${colLabel} Style`;
                  saveCurrentAsTemplate(store, core, colIdsRef.current, name);
                  setSaveAsTplName('');
                  flashSaveAsTpl();
                }}
                className="w-full h-7 rounded-[3px] text-[10px] font-medium cursor-pointer transition-all"
                style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
              >
                Save Template
              </button>
            </div>
          </Popover>
        </TGroup>
      )}

      <div className="gc-toolbar-sep h-5" />

      {/* ── Typography (B/I/U + Font Size + Colors) ── */}
      <TGroup>
        <TBtn disabled={disabled} tooltip="Bold" active={fmt.fontWeight === 'bold' || fmt.fontWeight === '700' || fmt.fontWeight === '900'}
          onClick={() => {
            const cur = getCurrentStyle(store, colIdsRef.current, targetRef.current);
            const isBold = cur.fontWeight === 'bold' || cur.fontWeight === '700' || cur.fontWeight === '900';
            doStyle({ fontWeight: isBold ? undefined : '700' });
          }}>
          <Bold size={14} strokeWidth={2.25} />
        </TBtn>
        <TBtn disabled={disabled} tooltip="Italic" active={fmt.fontStyle === 'italic'}
          onClick={() => {
            const cur = getCurrentStyle(store, colIdsRef.current, targetRef.current);
            doStyle({ fontStyle: cur.fontStyle === 'italic' ? undefined : 'italic' });
          }}>
          <Italic size={14} strokeWidth={1.75} />
        </TBtn>
        <TBtn disabled={disabled} tooltip="Underline" active={fmt.textDecoration === 'underline'}
          onClick={() => {
            const cur = getCurrentStyle(store, colIdsRef.current, targetRef.current);
            doStyle({ textDecoration: cur.textDecoration === 'underline' ? undefined : 'underline' });
          }}>
          <Underline size={14} strokeWidth={1.75} />
        </TBtn>
        <div className="gc-toolbar-sep h-4 opacity-50" />
        {/* Font Size */}
        <Popover
          trigger={
            <button disabled={disabled}
              className={cn(
                'flex items-center gap-1 px-2 py-[3px] rounded-[4px] text-[10px] font-mono transition-all duration-150 cursor-pointer gc-tbtn',
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
                className="flex items-center w-full px-2.5 py-1 rounded-[3px] text-[11px] font-mono hover:bg-accent cursor-pointer transition-colors"
                style={{ color: fmt.fontSize === sz ? 'var(--primary)' : 'var(--foreground)' }}
                onClick={() => doStyle({ fontSize: sz })}
                onMouseDown={(e) => e.preventDefault()}
              >
                {sz}
              </button>
            ))}
          </div>
        </Popover>
        <ColorPickerPopover disabled={disabled} value={fmt.color} icon={<Type size={11} strokeWidth={2} />}
          onChange={(c) => doStyle({ color: c })} compact />
        <ColorPickerPopover disabled={disabled} value={fmt.backgroundColor} icon={<PaintBucket size={11} strokeWidth={1.5} />}
          onChange={(c) => doStyle({ backgroundColor: c })} compact />
      </TGroup>

      <div className="gc-toolbar-sep h-5" />

      {/* ── Alignment ── */}
      <TGroup>
        <TBtn disabled={disabled} tooltip="Left" active={fmt.textAlign === 'left'}
          onClick={() => doStyle({ textAlign: fmt.textAlign === 'left' ? undefined : 'left' })}>
          <AlignLeft size={14} strokeWidth={1.75} />
        </TBtn>
        <TBtn disabled={disabled} tooltip="Center" active={fmt.textAlign === 'center'}
          onClick={() => doStyle({ textAlign: fmt.textAlign === 'center' ? undefined : 'center' })}>
          <AlignCenter size={14} strokeWidth={1.75} />
        </TBtn>
        <TBtn disabled={disabled} tooltip="Right" active={fmt.textAlign === 'right'}
          onClick={() => doStyle({ textAlign: fmt.textAlign === 'right' ? undefined : 'right' })}>
          <AlignRight size={14} strokeWidth={1.75} />
        </TBtn>
      </TGroup>

      <div className="gc-toolbar-sep h-5" />

      {/* ── Number Format ── */}
      <TGroup>
        <Popover
          trigger={
            <Button variant="ghost" size="icon-sm" disabled={disabled}
              className={cn('shrink-0 w-7 h-7 rounded-[5px] gc-tbtn transition-all duration-150', disabled && 'opacity-25 pointer-events-none')}
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}>
              <DollarSign size={14} strokeWidth={1.75} />
            </Button>
          }
        >
          <div className="p-1.5 min-w-[120px]">
            {Object.entries(FORMATTERS).filter(([k]) => ['USD', 'EUR', 'GBP', 'JPY'].includes(k)).map(([key, f]) => (
              <button
                key={key}
                className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-[3px] text-[11px] hover:bg-accent cursor-pointer transition-colors"
                style={{ color: 'var(--foreground)' }}
                onClick={() => doFormat(f.expr)}
                onMouseDown={(e) => e.preventDefault()}
              >
                <span className="font-mono font-semibold w-4" style={{ color: 'var(--muted-foreground)' }}>{f.label}</span>
                <span>{key}</span>
              </button>
            ))}
          </div>
        </Popover>
        <TBtn disabled={disabled} tooltip="Percentage"
          active={fmt.valueFormatter?.includes('percent')}
          onClick={() => doFormat(fmt.valueFormatter?.includes('percent') ? undefined : FORMATTERS.PERCENT.expr)}>
          <Percent size={14} strokeWidth={1.75} />
        </TBtn>
        <TBtn disabled={disabled} tooltip="Thousands"
          active={fmt.valueFormatter?.includes('maximumFractionDigits:0')}
          onClick={() => doFormat(fmt.valueFormatter?.includes('maximumFractionDigits:0') ? undefined : FORMATTERS.COMMA.expr)}>
          <Hash size={14} strokeWidth={1.75} />
        </TBtn>
        <div className="gc-toolbar-sep h-4 opacity-50" />
        <TBtn disabled={disabled} tooltip="Fewer decimals" onClick={decreaseDecimals}>
          <span className="flex items-center gap-px text-[9px] font-mono"><ArrowLeft size={9} strokeWidth={2} />.0</span>
        </TBtn>
        <TBtn disabled={disabled} tooltip="More decimals" onClick={increaseDecimals}>
          <span className="flex items-center gap-px text-[9px] font-mono">.0<ArrowRight size={9} strokeWidth={2} /></span>
        </TBtn>
      </TGroup>

      <div className="gc-toolbar-sep h-5" />

      {/* ── Borders ── */}
      <Popover
        trigger={
          <Button variant="ghost" size="icon-sm" disabled={disabled}
            className={cn('shrink-0 w-7 h-7 rounded-[5px] gc-tbtn transition-all duration-150', disabled && 'opacity-25 pointer-events-none')}
            onMouseDown={(e) => { e.preventDefault(); }}>
            <Grid3X3 size={14} strokeWidth={1.75} />
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

          return (
            <div className="p-4 w-[220px]" style={{ background: 'var(--card)' }}
              onMouseDown={(e) => { const tag = (e.target as HTMLElement).tagName; if (tag !== 'SELECT' && tag !== 'INPUT') e.preventDefault(); }}>

              {/* ── Visual cell preview with clickable edges ── */}
              <div className="relative w-full aspect-[3/2] rounded-[5px] mb-4" style={{ background: 'var(--background)', border: '1px dashed var(--border)' }}>
                {/* Top border toggle */}
                <button className="absolute top-0 left-3 right-3 h-[6px] cursor-pointer rounded-t-[2px] transition-all"
                  style={{ background: hasT ? activeColor : 'transparent' }}
                  onClick={() => toggleSide('Top')} onMouseDown={(e) => e.preventDefault()} />
                {/* Right border toggle */}
                <button className="absolute top-3 bottom-3 right-0 w-[6px] cursor-pointer rounded-r-[2px] transition-all"
                  style={{ background: hasR ? activeColor : 'transparent' }}
                  onClick={() => toggleSide('Right')} onMouseDown={(e) => e.preventDefault()} />
                {/* Bottom border toggle */}
                <button className="absolute bottom-0 left-3 right-3 h-[6px] cursor-pointer rounded-b-[2px] transition-all"
                  style={{ background: hasB ? activeColor : 'transparent' }}
                  onClick={() => toggleSide('Bottom')} onMouseDown={(e) => e.preventDefault()} />
                {/* Left border toggle */}
                <button className="absolute top-3 bottom-3 left-0 w-[6px] cursor-pointer rounded-l-[2px] transition-all"
                  style={{ background: hasL ? activeColor : 'transparent' }}
                  onClick={() => toggleSide('Left')} onMouseDown={(e) => e.preventDefault()} />
                {/* Center label */}
                <div className="absolute inset-0 flex items-center justify-center text-[9px] uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
                  {target === 'header' ? 'Header' : 'Cell'}
                </div>
              </div>

              {/* ── Preset buttons ── */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                <button className="flex flex-col items-center gap-1 py-1.5 rounded-[4px] text-[8px] cursor-pointer transition-all"
                  style={{ border: '1px solid var(--border)', color: 'var(--muted-foreground)', background: 'var(--background)' }}
                  onClick={() => setAllBorders(activeWidth)} onMouseDown={(e) => e.preventDefault()}>
                  <Square size={14} strokeWidth={2} />All
                </button>
                <button className="flex flex-col items-center gap-1 py-1.5 rounded-[4px] text-[8px] cursor-pointer transition-all"
                  style={{ border: '1px solid var(--border)', color: 'var(--muted-foreground)', background: 'var(--background)' }}
                  onClick={() => { doStyle({ borderTopWidth: activeWidth, borderTopStyle: 'solid', borderTopColor: activeColor, borderBottomWidth: activeWidth, borderBottomStyle: 'solid', borderBottomColor: activeColor }); }}
                  onMouseDown={(e) => e.preventDefault()}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="3" x2="21" y2="3"/><line x1="3" y1="21" x2="21" y2="21"/></svg>
                  T+B
                </button>
                <button className="flex flex-col items-center gap-1 py-1.5 rounded-[4px] text-[8px] cursor-pointer transition-all"
                  style={{ border: '1px solid var(--border)', color: 'var(--muted-foreground)', background: 'var(--background)' }}
                  onClick={() => doStyle({ borderBottomWidth: activeWidth, borderBottomStyle: 'solid', borderBottomColor: activeColor })}
                  onMouseDown={(e) => e.preventDefault()}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="21" x2="21" y2="21"/></svg>
                  Bottom
                </button>
                <button className="flex flex-col items-center gap-1 py-1.5 rounded-[4px] text-[8px] cursor-pointer transition-all"
                  style={{ border: '1px solid var(--border)', color: 'var(--destructive)', background: 'var(--background)' }}
                  onClick={clearAll} onMouseDown={(e) => e.preventDefault()}>
                  <X size={14} strokeWidth={2} />None
                </button>
              </div>

              {/* ── Color + Width row ── */}
              <div className="flex items-center gap-2.5">
                <label className="w-8 h-8 rounded-[5px] shrink-0 cursor-pointer relative overflow-hidden"
                  style={{ background: activeColor, border: '1px solid var(--border)' }}>
                  <input type="color" value={activeColor} onChange={(e) => {
                    const newColor = e.target.value;
                    const patch: Partial<CellStyleProperties> = {};
                    if (hasT) (patch as any).borderTopColor = newColor;
                    if (hasR) (patch as any).borderRightColor = newColor;
                    if (hasB) (patch as any).borderBottomColor = newColor;
                    if (hasL) (patch as any).borderLeftColor = newColor;
                    if (Object.keys(patch).length > 0) doStyle(patch);
                  }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </label>
                <select className="flex-1 h-8 text-[10px] rounded-[5px] px-2 cursor-pointer"
                  style={{ background: 'var(--background)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
                  value={activeWidth} onChange={(e) => {
                    const newWidth = e.target.value;
                    const patch: Partial<CellStyleProperties> = {};
                    if (hasT) (patch as any).borderTopWidth = newWidth;
                    if (hasR) (patch as any).borderRightWidth = newWidth;
                    if (hasB) (patch as any).borderBottomWidth = newWidth;
                    if (hasL) (patch as any).borderLeftWidth = newWidth;
                    if (Object.keys(patch).length > 0) doStyle(patch);
                  }}>
                  <option value="1px">1px - Thin</option>
                  <option value="2px">2px - Medium</option>
                  <option value="3px">3px - Thick</option>
                </select>
              </div>
            </div>
          );
        })()}
      </Popover>

      <div className="gc-toolbar-sep h-5" />

      {/* ── History + Actions ── */}
      <TGroup>
        <TBtn tooltip="Undo" disabled={store((s) => s.undoStack.length) === 0}
          onClick={() => store.getState().undo()}>
          <Undo2 size={14} strokeWidth={1.75} />
        </TBtn>
        <TBtn tooltip="Redo" disabled={store((s) => s.redoStack.length) === 0}
          onClick={() => store.getState().redo()}>
          <Redo2 size={14} strokeWidth={1.75} />
        </TBtn>
        <div className="gc-toolbar-sep h-4 opacity-50" />
        <TBtn tooltip="Clear all styles" onClick={() => {
          store.getState().pushUndoPoint('Before Clear All');
          store.getState().setModuleState('column-templates', () => ({ templates: {}, typeDefaults: {} }));
          store.getState().setModuleState('column-customization', () => ({ assignments: {} }));
          core.cssInjector.clear();
          try {
            document.querySelectorAll('.ag-header-cell').forEach((el) => {
              const s = (el as HTMLElement).style;
              s.removeProperty('font-weight'); s.removeProperty('font-style');
              s.removeProperty('font-size'); s.removeProperty('font-family');
              s.removeProperty('text-decoration'); s.removeProperty('color');
              s.removeProperty('background-color');
            });
          } catch { /* */ }
          flashClear();
        }} className={clearConfirmed ? 'gc-tbtn-confirm' : undefined}>
          {clearConfirmed
            ? <Check size={14} strokeWidth={2.5} style={{ color: 'var(--bn-green, #2dd4bf)' }} />
            : <Trash2 size={14} strokeWidth={1.75} />
          }
        </TBtn>
        <TBtn tooltip="Save" onClick={() => {
          try {
            const serialized = core.serializeAll();
            localStorage.setItem(`gc-state:${(core as any).gridId}`, JSON.stringify(serialized));
            store.getState().setDirty(false);
            store.setState({ undoStack: [], redoStack: [] });
          } catch { /* */ }
          flashSave();
        }} className={saveConfirmed ? 'gc-tbtn-confirm' : undefined}>
          {saveConfirmed
            ? <Check size={14} strokeWidth={2.5} style={{ color: 'var(--bn-green, #2dd4bf)' }} />
            : <Save size={14} strokeWidth={1.75} />
          }
        </TBtn>
      </TGroup>
    </div>
  );
}
