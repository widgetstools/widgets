export interface QueryCondition {
  column: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'greaterThanOrEqual' | 'lessThanOrEqual' | 'inRange' | 'blank' | 'notBlank';
  value: string;
  valueTo?: string; // for inRange
}

export interface NamedQuery {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  combinator: 'AND' | 'OR';
  conditions: QueryCondition[];
  expressionMode: boolean;
  expression?: string; // for advanced expression-based queries
}

export interface NamedQueriesState {
  queries: NamedQuery[];
  activeQueryIds: string[];
  quickFilterText: string;
  advancedFilterEnabled: boolean;
  floatingFiltersEnabled: boolean;
}

export const INITIAL_NAMED_QUERIES: NamedQueriesState = {
  queries: [],
  activeQueryIds: [],
  quickFilterText: '',
  advancedFilterEnabled: false,
  floatingFiltersEnabled: true,
};
