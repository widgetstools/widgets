import type { ColDef, ColGroupDef, EditableCallbackParams } from 'ag-grid-community';
import type { GridCustomizerModule } from '../../types/module';
import type { GridContext } from '../../types/common';
import { INITIAL_ENTITLEMENTS, type EntitlementsState, type EntitlementRule } from './state';
import { EntitlementsPanel } from './EntitlementsPanel';

function evaluateRule(rule: EntitlementRule, params: EditableCallbackParams): boolean {
  if (!rule.enabled) return rule.fallback === 'allow';

  switch (rule.type) {
    case 'row-value': {
      try {
        const data = params.data ?? {};
        const fn = new Function('data', `with(data) { return Boolean(${rule.expression}); }`);
        return fn(data);
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
): (ColDef | ColGroupDef)[] {
  const enabledRules = rules.filter((r) => r.enabled);
  if (enabledRules.length === 0) return defs;

  return defs.map((def) => {
    if ('children' in def && def.children) {
      return { ...def, children: applyEntitlements(def.children, rules) };
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
        // Check original editable first
        let baseEditable = true;
        if (typeof originalEditable === 'function') {
          baseEditable = originalEditable(params);
        } else if (typeof originalEditable === 'boolean') {
          baseEditable = originalEditable;
        }

        if (!baseEditable) return false;

        // Evaluate all entitlement rules; all must pass
        return applicableRules.every((rule) => evaluateRule(rule, params));
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

  transformColumnDefs(
    defs: (ColDef | ColGroupDef)[],
    state: EntitlementsState,
    _ctx: GridContext,
  ): (ColDef | ColGroupDef)[] {
    return applyEntitlements(defs, state.rules);
  },

  serialize: (state) => state,
  deserialize: (data) => ({
    ...INITIAL_ENTITLEMENTS,
    ...(data as Partial<EntitlementsState>),
  }),

  SettingsPanel: EntitlementsPanel,
};

export type { EntitlementRule, EntitlementsState } from './state';
