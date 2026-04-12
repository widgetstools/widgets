import type { ColDef, ColGroupDef, GridOptions, IRowNode } from 'ag-grid-community';
import type { GridCustomizerModule } from '../../types/module';
import type { GridContext } from '../../types/common';
import { ExpressionEngine } from '../../expression';
import { INITIAL_NAMED_QUERIES, type NamedQueriesState, type NamedQuery, type QueryCondition } from './state';
import { NamedQueriesPanel } from './NamedQueriesPanel';

const engine = new ExpressionEngine();

function evaluateCondition(condition: QueryCondition, data: Record<string, unknown>): boolean {
  const cellValue = data[condition.column];

  if (condition.operator === 'blank') {
    return cellValue == null || cellValue === '';
  }
  if (condition.operator === 'notBlank') {
    return cellValue != null && cellValue !== '';
  }

  const strValue = String(cellValue ?? '');
  const numValue = Number(cellValue);
  const condValue = condition.value;
  const condNum = Number(condValue);

  switch (condition.operator) {
    case 'equals':
      return strValue === condValue;
    case 'notEquals':
      return strValue !== condValue;
    case 'contains':
      return strValue.toLowerCase().includes(condValue.toLowerCase());
    case 'startsWith':
      return strValue.toLowerCase().startsWith(condValue.toLowerCase());
    case 'endsWith':
      return strValue.toLowerCase().endsWith(condValue.toLowerCase());
    case 'greaterThan':
      return !isNaN(numValue) && !isNaN(condNum) && numValue > condNum;
    case 'lessThan':
      return !isNaN(numValue) && !isNaN(condNum) && numValue < condNum;
    case 'greaterThanOrEqual':
      return !isNaN(numValue) && !isNaN(condNum) && numValue >= condNum;
    case 'lessThanOrEqual':
      return !isNaN(numValue) && !isNaN(condNum) && numValue <= condNum;
    case 'inRange': {
      const condTo = Number(condition.valueTo ?? '');
      return !isNaN(numValue) && !isNaN(condNum) && !isNaN(condTo) && numValue >= condNum && numValue <= condTo;
    }
    default:
      return false;
  }
}

function evaluateQuery(query: NamedQuery, data: Record<string, unknown>): boolean {
  if (query.expressionMode && query.expression) {
    try {
      const result = engine.parseAndEvaluate(query.expression, {
        x: null,
        value: null,
        data,
        columns: data,
      });
      return Boolean(result);
    } catch {
      return false;
    }
  }

  if (query.conditions.length === 0) return true;

  if (query.combinator === 'AND') {
    return query.conditions.every((c) => evaluateCondition(c, data));
  }
  return query.conditions.some((c) => evaluateCondition(c, data));
}

function buildFilterModel(
  queries: NamedQuery[],
): Record<string, unknown> | null {
  // Only simple (non-expression) queries with conditions can be converted to filterModel
  const simpleQueries = queries.filter((q) => !q.expressionMode && q.conditions.length > 0);
  if (simpleQueries.length === 0) return null;

  const model: Record<string, unknown> = {};

  for (const query of simpleQueries) {
    for (const cond of query.conditions) {
      // Map operator to AG-Grid filter type
      const agType = mapOperatorToAgType(cond.operator);
      if (!agType) continue;

      const filterEntry: Record<string, unknown> = {
        type: agType,
        filter: cond.value,
      };

      if (cond.operator === 'inRange' && cond.valueTo) {
        filterEntry.filterTo = cond.valueTo;
      }

      // If column already has a filter, combine with condition
      if (model[cond.column]) {
        const existing = model[cond.column] as Record<string, unknown>;
        model[cond.column] = {
          filterType: 'text',
          operator: query.combinator,
          condition1: existing,
          condition2: filterEntry,
        };
      } else {
        model[cond.column] = filterEntry;
      }
    }
  }

  return Object.keys(model).length > 0 ? model : null;
}

function mapOperatorToAgType(
  op: QueryCondition['operator'],
): string | null {
  switch (op) {
    case 'equals': return 'equals';
    case 'notEquals': return 'notEqual';
    case 'contains': return 'contains';
    case 'startsWith': return 'startsWith';
    case 'endsWith': return 'endsWith';
    case 'greaterThan': return 'greaterThan';
    case 'lessThan': return 'lessThan';
    case 'greaterThanOrEqual': return 'greaterThanOrEqual';
    case 'lessThanOrEqual': return 'lessThanOrEqual';
    case 'inRange': return 'inRange';
    case 'blank': return 'blank';
    case 'notBlank': return 'notBlank';
    default: return null;
  }
}

export const namedQueriesModule: GridCustomizerModule<NamedQueriesState> = {
  id: 'named-queries',
  name: 'Named Queries & Filters',
  icon: 'Filter',
  priority: 60,

  getInitialState: () => ({ ...INITIAL_NAMED_QUERIES }),

  transformGridOptions(
    opts: Partial<GridOptions>,
    state: NamedQueriesState,
    _ctx: GridContext,
  ): Partial<GridOptions> {
    const result: Partial<GridOptions> = { ...opts };

    // Quick filter
    if (state.quickFilterText) {
      result.quickFilterText = state.quickFilterText;
    }

    // Advanced filter
    if (state.advancedFilterEnabled) {
      result.enableAdvancedFilter = true;
    }

    // External filter for expression-mode active queries
    const activeExpressionQueries = state.queries.filter(
      (q) => q.enabled && state.activeQueryIds.includes(q.id) && q.expressionMode && q.expression,
    );

    if (activeExpressionQueries.length > 0) {
      result.isExternalFilterPresent = () => true;
      result.doesExternalFilterPass = (node: IRowNode) => {
        if (!node.data) return true;
        return activeExpressionQueries.every((q) => evaluateQuery(q, node.data));
      };
    }

    // Apply filterModel for simple condition queries on gridReady
    const activeSimpleQueries = state.queries.filter(
      (q) => q.enabled && state.activeQueryIds.includes(q.id) && !q.expressionMode && q.conditions.length > 0,
    );

    if (activeSimpleQueries.length > 0) {
      const existingOnGridReady = result.onGridReady;
      result.onGridReady = (params) => {
        if (existingOnGridReady) {
          existingOnGridReady(params);
        }
        const filterModel = buildFilterModel(activeSimpleQueries);
        if (filterModel) {
          params.api.setFilterModel(filterModel);
        }
      };
    }

    return result;
  },

  transformColumnDefs(
    defs: (ColDef | ColGroupDef)[],
    state: NamedQueriesState,
    _ctx: GridContext,
  ): (ColDef | ColGroupDef)[] {
    if (!state.floatingFiltersEnabled) return defs;

    return defs.map((def) => {
      if ('children' in def && def.children) {
        return {
          ...def,
          children: def.children.map((child) => ({
            ...child,
            floatingFilter: true,
          })),
        };
      }
      return { ...def, floatingFilter: true };
    });
  },

  serialize: (state) => state,
  deserialize: (data) => ({
    ...INITIAL_NAMED_QUERIES,
    ...(data as Partial<NamedQueriesState>),
  }),

  SettingsPanel: NamedQueriesPanel,
};

export type { NamedQuery, QueryCondition, NamedQueriesState } from './state';
