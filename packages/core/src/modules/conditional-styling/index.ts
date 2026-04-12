import type { ColDef, ColGroupDef, GridOptions, CellClassParams, RowClassParams } from 'ag-grid-community';
import type { GridCustomizerModule } from '../../types/module';
import type { GridContext, ModuleContext, CellStyleProperties, ExpressionEngineInstance } from '../../types/common';
import type { ConditionalRule, ConditionalStylingState } from './state';
import { INITIAL_CONDITIONAL_STYLING } from './state';
import { ConditionalStylingPanel } from './ConditionalStylingPanel';

/** Per-grid expression engine + CSS injector */
const _gridEngines = new Map<string, { engine: ExpressionEngineInstance; cssInjector: ModuleContext['cssInjector'] }>();
/** Fallback for when GridContext is null (pre-gridApi) */
let _lastGridId: string | null = null;

function buildCssText(ruleId: string, light: CellStyleProperties, dark: CellStyleProperties): string {
  const lightProps = styleToCSS(light);
  const darkProps = styleToCSS(dark);
  const lines: string[] = [];

  if (lightProps) {
    lines.push(`:root:not(.dark) .gc-rule-${ruleId} { ${lightProps} }`);
  }
  if (darkProps) {
    lines.push(`.dark .gc-rule-${ruleId} { ${darkProps} }`);
  }
  // Fallback for single-theme usage
  if (lightProps && !darkProps) {
    lines.push(`.gc-rule-${ruleId} { ${lightProps} }`);
  }

  return lines.join('\n');
}

function styleToCSS(style: CellStyleProperties): string {
  const parts: string[] = [];
  if (style.backgroundColor) parts.push(`background-color: ${style.backgroundColor}`);
  if (style.color) parts.push(`color: ${style.color}`);
  if (style.fontWeight) parts.push(`font-weight: ${style.fontWeight}`);
  if (style.fontStyle) parts.push(`font-style: ${style.fontStyle}`);
  if (style.fontSize) parts.push(`font-size: ${style.fontSize}`);
  if (style.borderTopWidth) parts.push(`border-top: ${style.borderTopWidth} ${style.borderTopStyle ?? 'solid'} ${style.borderTopColor ?? 'currentColor'}`);
  if (style.borderRightWidth) parts.push(`border-right: ${style.borderRightWidth} ${style.borderRightStyle ?? 'solid'} ${style.borderRightColor ?? 'currentColor'}`);
  if (style.borderBottomWidth) parts.push(`border-bottom: ${style.borderBottomWidth} ${style.borderBottomStyle ?? 'solid'} ${style.borderBottomColor ?? 'currentColor'}`);
  if (style.borderLeftWidth) parts.push(`border-left: ${style.borderLeftWidth} ${style.borderLeftStyle ?? 'solid'} ${style.borderLeftColor ?? 'currentColor'}`);
  return parts.join('; ');
}

function createCellClassRule(engine: ExpressionEngineInstance, rule: ConditionalRule): ((params: CellClassParams) => boolean) | string {
  // Try to compile to AG-Grid string expression (fastest path)
  try {
    const ast = engine.parse(rule.expression);
    const agString = engine.tryCompileToAgString(ast);
    if (agString) return agString;
  } catch {
    // Fall through to function-based
  }

  // Function-based fallback
  return (params: CellClassParams) => {
    try {
      const result = engine.parseAndEvaluate(rule.expression, {
        x: params.value,
        value: params.value,
        data: params.data ?? {},
        columns: params.data ?? {},
      });
      return Boolean(result);
    } catch {
      return false;
    }
  };
}

function applyRulesToDefs(
  defs: (ColDef | ColGroupDef)[],
  rules: ConditionalRule[],
  engine: ExpressionEngineInstance,
): (ColDef | ColGroupDef)[] {
  const cellRules = rules.filter((r) => r.enabled && r.scope.type === 'cell');
  if (cellRules.length === 0) return defs;

  return defs.map((def) => {
    if ('children' in def && def.children) {
      return { ...def, children: applyRulesToDefs(def.children, rules, engine) };
    }

    const colDef = def as ColDef;
    const colId = colDef.colId ?? colDef.field;
    if (!colId) return colDef;

    const applicableRules = cellRules.filter(
      (r) => r.scope.type === 'cell' && r.scope.columns.includes(colId),
    );
    if (applicableRules.length === 0) return colDef;

    const cellClassRules: Record<string, ((params: CellClassParams) => boolean) | string> = {
      ...(colDef.cellClassRules as Record<string, any> ?? {}),
    };

    for (const rule of applicableRules) {
      cellClassRules[`gc-rule-${rule.id}`] = createCellClassRule(engine, rule);
    }

    return { ...colDef, cellClassRules };
  });
}

export const conditionalStylingModule: GridCustomizerModule<ConditionalStylingState> = {
  id: 'conditional-styling',
  name: 'Conditional Styling',
  icon: 'Palette',
  priority: 20,

  getInitialState: () => ({ ...INITIAL_CONDITIONAL_STYLING }),

  onRegister(ctx: ModuleContext): void {
    _gridEngines.set(ctx.gridId, { engine: ctx.expressionEngine, cssInjector: ctx.cssInjector });
    _lastGridId = ctx.gridId;
    // Inject CSS rules for all enabled rules
    const state = ctx.getModuleState<ConditionalStylingState>('conditional-styling');
    for (const rule of state.rules) {
      if (!rule.enabled) continue;
      const cssText = buildCssText(rule.id, rule.style.light, rule.style.dark);
      ctx.cssInjector.addRule(`conditional-${rule.id}`, cssText);
    }
  },

  onGridDestroy(ctx: GridContext): void {
    _gridEngines.delete(ctx.gridId);
    if (_lastGridId === ctx.gridId) _lastGridId = null;
  },

  transformColumnDefs(
    defs: (ColDef | ColGroupDef)[],
    state: ConditionalStylingState,
    _ctx: GridContext,
  ): (ColDef | ColGroupDef)[] {
    const gridId = _ctx?.gridId ?? _lastGridId;
    const gctx = gridId ? _gridEngines.get(gridId) : undefined;
    if (!gctx) return defs;
    const enabledRules = state.rules.filter((r) => r.enabled).sort((a, b) => a.priority - b.priority);
    if (enabledRules.length === 0) return defs;
    return applyRulesToDefs(defs, enabledRules, gctx.engine);
  },

  transformGridOptions(
    opts: Partial<GridOptions>,
    state: ConditionalStylingState,
    _ctx: GridContext,
  ): Partial<GridOptions> {
    const gridId = _ctx?.gridId ?? _lastGridId;
    const gctx = gridId ? _gridEngines.get(gridId) : undefined;
    const rowRules = state.rules.filter((r) => r.enabled && r.scope.type === 'row');
    if (rowRules.length === 0 || !gctx) return opts;

    const rowClassRules: Record<string, (params: RowClassParams) => boolean> = {
      ...(opts.rowClassRules as Record<string, any> ?? {}),
    };

    for (const rule of rowRules) {
      rowClassRules[`gc-rule-${rule.id}`] = (params: RowClassParams) => {
        try {
          const result = gctx.engine.parseAndEvaluate(rule.expression, {
            x: null,
            value: null,
            data: params.data ?? {},
            columns: params.data ?? {},
          });
          return Boolean(result);
        } catch {
          return false;
        }
      };
    }

    return { ...opts, rowClassRules };
  },

  serialize: (state) => state,
  deserialize: (data) => ({
    ...INITIAL_CONDITIONAL_STYLING,
    ...(data as Partial<ConditionalStylingState>),
  }),

  SettingsPanel: ConditionalStylingPanel,
};

export type { ConditionalRule, ConditionalStylingState } from './state';
