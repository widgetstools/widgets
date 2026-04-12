import type { ColDef, ColGroupDef, GridOptions, CellValueChangedEvent } from 'ag-grid-community';
import type { GridCustomizerModule } from '../../types/module';
import type { GridContext, ModuleContext, ExpressionEngineInstance } from '../../types/common';
import type { FlashRule, CellFlashingState } from './state';
import { INITIAL_CELL_FLASHING } from './state';
import { CellFlashingWizard } from './CellFlashingWizard';

/** Per-grid resources for cell flashing */
interface FlashGridCtx {
  cssInjector: { addRule: (id: string, css: string) => void; removeRule: (id: string) => void };
  expressionEngine: ExpressionEngineInstance;
  cleanup?: () => void;
}
const _gridCtx = new Map<string, FlashGridCtx>();

function buildFlashCss(ruleId: string, rule: FlashRule): string {
  const lines: string[] = [];

  // Up color (value increased)
  lines.push(`:root:not(.dark) .gc-flash-up-${ruleId} { background-color: ${rule.upColor.light} !important; }`);
  lines.push(`.dark .gc-flash-up-${ruleId} { background-color: ${rule.upColor.dark} !important; }`);
  lines.push(`.gc-flash-up-${ruleId} { background-color: ${rule.upColor.light} !important; }`);

  // Down color (value decreased)
  lines.push(`:root:not(.dark) .gc-flash-down-${ruleId} { background-color: ${rule.downColor.light} !important; }`);
  lines.push(`.dark .gc-flash-down-${ruleId} { background-color: ${rule.downColor.dark} !important; }`);
  lines.push(`.gc-flash-down-${ruleId} { background-color: ${rule.downColor.light} !important; }`);

  // Neutral color (non-directional change)
  lines.push(`:root:not(.dark) .gc-flash-neutral-${ruleId} { background-color: ${rule.neutralColor.light} !important; }`);
  lines.push(`.dark .gc-flash-neutral-${ruleId} { background-color: ${rule.neutralColor.dark} !important; }`);
  lines.push(`.gc-flash-neutral-${ruleId} { background-color: ${rule.neutralColor.light} !important; }`);

  return lines.join('\n');
}

/**
 * Build CSS that overrides AG Grid's built-in flash class to use the rule's color
 * for the given direction. This is applied temporarily before calling flashCells().
 */
function buildActiveFlashOverrideCss(rule: FlashRule, direction: 'up' | 'down' | 'neutral'): string {
  const colors = direction === 'up' ? rule.upColor : direction === 'down' ? rule.downColor : rule.neutralColor;
  const lines: string[] = [];
  lines.push(`:root:not(.dark) .ag-cell-data-changed { background-color: ${colors.light} !important; }`);
  lines.push(`.dark .ag-cell-data-changed { background-color: ${colors.dark} !important; }`);
  lines.push(`.ag-cell-data-changed { background-color: ${colors.light} !important; }`);
  return lines.join('\n');
}

function evaluateCondition(engine: ExpressionEngineInstance, rule: FlashRule, value: unknown, oldValue: unknown, data: Record<string, unknown>): boolean {
  if (!rule.condition) return true;
  try {
    const result = engine.parseAndEvaluate(rule.condition, {
      x: value,
      value,
      data: data ?? {},
      columns: data ?? {},
    });
    return Boolean(result);
  } catch {
    return true; // Flash by default if condition is invalid
  }
}

function determineDirection(value: unknown, oldValue: unknown): 'up' | 'down' | 'neutral' {
  const numNew = typeof value === 'number' ? value : Number(value);
  const numOld = typeof oldValue === 'number' ? oldValue : Number(oldValue);
  if (!isNaN(numNew) && !isNaN(numOld)) {
    if (numNew > numOld) return 'up';
    if (numNew < numOld) return 'down';
  }
  return 'neutral';
}

export const cellFlashingModule: GridCustomizerModule<CellFlashingState> = {
  id: 'cell-flashing',
  name: 'Cell & Row Flashing',
  icon: 'Zap',
  priority: 40,

  getInitialState: () => ({ ...INITIAL_CELL_FLASHING }),

  onRegister(ctx: ModuleContext): void {
    const state = ctx.getModuleState<CellFlashingState>('cell-flashing');
    for (const rule of state.rules) {
      if (!rule.enabled) continue;
      const cssText = buildFlashCss(rule.id, rule);
      ctx.cssInjector.addRule(`flash-${rule.id}`, cssText);
    }
    _gridCtx.set(ctx.gridId, {
      cssInjector: ctx.cssInjector,
      expressionEngine: ctx.expressionEngine,
    });
  },

  transformColumnDefs(
    defs: (ColDef | ColGroupDef)[],
    state: CellFlashingState,
    _ctx: GridContext,
  ): (ColDef | ColGroupDef)[] {
    if (!state.enableChangeDetection) return defs;

    const enabledRules = state.rules.filter((r) => r.enabled);
    // Collect all targeted column IDs; empty array means "all columns"
    const targetColumns = new Set<string>();
    let allColumns = false;

    for (const rule of enabledRules) {
      if (rule.columns.length === 0) {
        allColumns = true;
        break;
      }
      for (const col of rule.columns) {
        targetColumns.add(col);
      }
    }

    return defs.map((def) => {
      if ('children' in def && def.children) {
        return {
          ...def,
          children: cellFlashingModule.transformColumnDefs!(def.children, state, _ctx),
        };
      }

      const colDef = def as ColDef;
      const colId = colDef.colId ?? colDef.field;
      if (!colId) return colDef;

      if (allColumns || targetColumns.has(colId)) {
        return { ...colDef, enableCellChangeFlash: true };
      }

      return colDef;
    });
  },

  transformGridOptions(
    opts: Partial<GridOptions>,
    state: CellFlashingState,
    _ctx: GridContext,
  ): Partial<GridOptions> {
    return {
      ...opts,
      cellFlashDuration: state.globalFlashDuration,
      cellFadeDuration: state.globalFadeDuration,
    };
  },

  onGridReady(ctx: GridContext): void {
    const { gridId, gridApi } = ctx;
    const gctx = _gridCtx.get(gridId);

    const handler = (event: CellValueChangedEvent) => {
      // Re-read state dynamically so we always use current rules
      const state: CellFlashingState | undefined = (gridApi as any).__gcGetModuleState?.('cell-flashing');
      const rules = state?.rules?.filter((r) => r.enabled) ?? [];
      if (rules.length === 0) return;

      const colId = event.column?.getColId?.();
      if (!colId) return;

      for (const rule of rules) {
        // Check if this column is targeted
        if (rule.columns.length > 0 && !rule.columns.includes(colId)) continue;

        // Evaluate optional condition (use per-grid expression engine)
        if (gctx && !evaluateCondition(gctx.expressionEngine, rule, event.newValue, event.oldValue, event.data ?? {})) continue;

        const direction = determineDirection(event.newValue, event.oldValue);

        // Inject a temporary CSS override so AG Grid's built-in flash uses
        // this rule's color for the detected direction.
        if (gctx?.cssInjector) {
          const overrideCss = buildActiveFlashOverrideCss(rule, direction);
          gctx.cssInjector.addRule(`flash-active-${rule.id}`, overrideCss);
        }

        if (rule.scope === 'row') {
          // Flash all columns for the row
          const rowNode = event.node;
          if (rowNode) {
            gridApi.flashCells({
              rowNodes: [rowNode],
              flashDuration: rule.flashDuration,
              fadeDuration: rule.fadeDuration,
            });
          }
        } else {
          // Flash only the changed cell
          gridApi.flashCells({
            rowNodes: event.node ? [event.node] : [],
            columns: [colId],
            flashDuration: rule.flashDuration,
            fadeDuration: rule.fadeDuration,
          });
        }
      }
    };

    gridApi.addEventListener('cellValueChanged', handler);

    const entry = _gridCtx.get(gridId);
    if (entry) entry.cleanup = () => gridApi.removeEventListener('cellValueChanged', handler);
  },

  onGridDestroy(ctx: GridContext): void {
    const entry = _gridCtx.get(ctx.gridId);
    if (entry?.cleanup) entry.cleanup();
    _gridCtx.delete(ctx.gridId);
  },

  serialize: (state) => state,
  deserialize: (data) => ({
    ...INITIAL_CELL_FLASHING,
    ...(data as Partial<CellFlashingState>),
  }),

  SettingsPanel: CellFlashingWizard,
};

export type { FlashRule, CellFlashingState } from './state';
