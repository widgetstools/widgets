export interface SortFilterState {
  multiSortKey: 'ctrl' | 'shift' | undefined;
  sortingOrder: ('asc' | 'desc' | null)[];
  accentedSort: boolean;
  suppressMultiSort: boolean;
  floatingFiltersEnabled: boolean;
  quickFilterText: string;
  cacheQuickFilter: boolean;
  advancedFilterEnabled: boolean;
}

export const INITIAL_SORT_FILTER: SortFilterState = {
  multiSortKey: 'ctrl',
  sortingOrder: ['asc', 'desc', null],
  accentedSort: false,
  suppressMultiSort: false,
  floatingFiltersEnabled: true,
  quickFilterText: '',
  cacheQuickFilter: true,
  advancedFilterEnabled: false,
};
