import type { ColDef, ColGroupDef, GridOptions, CellValueChangedEvent } from 'ag-grid-community';
import type { GridCustomizerModule } from '../../types/module';
import type { GridContext, ModuleContext } from '../../types/common';
import { ExpressionEngine } from '../../expression';
import type { FlashRule, CellFlashingState } from './state';
import { INITIAL_CELL_FLASHING } from './state';
import { CellFlashingWizard } from './CellFlashingWizard';

const engine = new ExpressionEngine();

/** Map of gridId -> cleanup function for cellValueChanged listener */
const cleanupMap = new Map<string, () => void>();

/** Map of gridId -> CssInjectorInstance for dynamic flash color swapping */
const injectorMap = new Map<string, { addRule: (id: string, css: string) => void; removeRule: (id: string) => void }>();

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

function evaluateCondition(rule: FlashRule, value: unknown, oldValue: unknown, data: Record<string, unknown>): boolean {
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
    injectorMap.set(ctx.gridId, ctx.cssInjector);
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

        // Evaluate optional condition
        if (!evaluateCondition(rule, event.newValue, event.oldValue, event.data ?? {})) continue;

        const direction = determineDirection(event.newValue, event.oldValue);

        // Inject a temporary CSS override so AG Grid's built-in flash uses
        // this rule's color for the detected direction.
        const cssInjector = injectorMap.get(gridId);
        if (cssInjector) {
          const overrideCss = buildActiveFlashOverrideCss(rule, direction);
          cssInjector.addRule(`flash-active-${rule.id}`, overrideCss);
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

    cleanupMap.set(gridId, () => {
      gridApi.removeEventListener('cellValueChanged', handler);
    });
  },

  onGridDestroy(ctx: GridContext): void {
    const cleanup = cleanupMap.get(ctx.gridId);
    if (cleanup) {
      cleanup();
      cleanupMap.delete(ctx.gridId);
    }
  },

  serialize: (state) => state,
  deserialize: (data) => ({
    ...INITIAL_CELL_FLASHING,
    ...(data as Partial<CellFlashingState>),
  }),

  SettingsPanel: CellFlashingWizard,
};

export type { FlashRule, CellFlashingState } from './state';
