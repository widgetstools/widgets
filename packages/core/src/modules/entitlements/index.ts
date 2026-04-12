import type { ColDef, ColGroupDef, EditableCallbackParams } from 'ag-grid-community';
import type { GridCustomizerModule } from '../../types/module';
import type { GridContext, ModuleContext, ExpressionEngineInstance } from '../../types/common';
import { INITIAL_ENTITLEMENTS, type EntitlementsState, type EntitlementRule } from './state';
import { EntitlementsPanel } from './EntitlementsPanel';

/** Per-grid expression engine */
const _engines = new Map<string, ExpressionEngineInstance>();
let _lastGridId: string | null = null;

function evaluateRule(engine: ExpressionEngineInstance, rule: EntitlementRule, params: EditableCallbackParams): boolean {
  if (!rule.enabled) return rule.fallback === 'allow';

  switch (rule.type) {
    case 'row-value': {
      try {
        const data = params.data ?? {};
        const result = engine!.parseAndEvaluate(rule.expression, {
          x: data,
          value: data,
          data: data,
          columns: data,
        });
        return Boolean(result);
      } catch {
        return rule.fallback === 'allow';
      }
    }
    case 'role-based': {
      // Roles would be supplied via context; fallback when not available
      const ctx = (params as any).context;
      const userRoles: string[] = ctx?.userRoles ?? [];
      if (rule.roles.length === 0) return rule.fallback === 'allow';
      return rule.roles.some((r) => userRoles.includes(r));
    }
    case 'rest': {
      // REST entitlements are resolved asynchronously outside the grid callback;
      // at render time we use the cached result stored on context, defaulting to fallback
      const cache = (params as any).context?.entitlementCache as Record<string, boolean> | undefined;
      if (cache && rule.id in cache) return cache[rule.id];
      return rule.fallback === 'allow';
    }
    default:
      return rule.fallback === 'allow';
  }
}

function applyEntitlements(
  defs: (ColDef | ColGroupDef)[],
  rules: EntitlementRule[],
  engine: ExpressionEngineInstance,
): (ColDef | ColGroupDef)[] {
  const enabledRules = rules.filter((r) => r.enabled);
  if (enabledRules.length === 0) return defs;

  return defs.map((def) => {
    if ('children' in def && def.children) {
      return { ...def, children: applyEntitlements(def.children, rules, engine) };
    }

    const colDef = def as ColDef;
    const colId = colDef.colId ?? colDef.field;
    if (!colId) return colDef;

    const applicableRules = enabledRules.filter((r) => r.columnId === colId);
    if (applicableRules.length === 0) return colDef;

    const originalEditable = colDef.editable;

    return {
      ...colDef,
      editable: (params: EditableCallbackParams) => {
        let baseEditable = true;
        if (typeof originalEditable === 'function') {
          baseEditable = originalEditable(params);
        } else if (typeof originalEditable === 'boolean') {
          baseEditable = originalEditable;
        }
        if (!baseEditable) return false;
        return applicableRules.every((rule) => evaluateRule(engine, rule, params));
      },
    };
  });
}

export const entitlementsModule: GridCustomizerModule<EntitlementsState> = {
  id: 'entitlements',
  name: 'Entitlements',
  icon: 'Lock',
  priority: 50,

  getInitialState: () => ({ ...INITIAL_ENTITLEMENTS }),

  onRegister(ctx: ModuleContext): void {
    _engines.set(ctx.gridId, ctx.expressionEngine);
    _lastGridId = ctx.gridId;
  },

  onGridDestroy(ctx: GridContext): void {
    _engines.delete(ctx.gridId);
    if (_lastGridId === ctx.gridId) _lastGridId = null;
  },

  transformColumnDefs(
    defs: (ColDef | ColGroupDef)[],
    state: EntitlementsState,
    _ctx: GridContext,
  ): (ColDef | ColGroupDef)[] {
    const gridId = _ctx?.gridId ?? _lastGridId;
    const engine = gridId ? _engines.get(gridId) : undefined;
    if (!engine) return defs;
    return applyEntitlements(defs, state.rules, engine);
  },

  serialize: (state) => state,
  deserialize: (data) => ({
    ...INITIAL_ENTITLEMENTS,
    ...(data as Partial<EntitlementsState>),
  }),

  SettingsPanel: EntitlementsPanel,
};

export type { EntitlementRule, EntitlementsState } from './state';
