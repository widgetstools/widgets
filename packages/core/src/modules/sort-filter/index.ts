import type { ColDef, ColGroupDef, GridOptions } from 'ag-grid-community';
import type { GridCustomizerModule } from '../../types/module';
import type { GridContext } from '../../types/common';
import { INITIAL_SORT_FILTER, type SortFilterState } from './state';
import { SortFilterPanel } from './SortFilterPanel';

export const sortFilterModule: GridCustomizerModule<SortFilterState> = {
  id: 'sort-filter',
  name: 'Sort & Filter',
  icon: 'ArrowUpDown',
  priority: 55,

  getInitialState: () => ({ ...INITIAL_SORT_FILTER }),

  transformGridOptions(
    opts: Partial<GridOptions>,
    state: SortFilterState,
    _ctx: GridContext,
  ): Partial<GridOptions> {
    return {
      ...opts,
      multiSortKey: state.multiSortKey === 'ctrl' ? 'ctrl' : undefined,
      sortingOrder: state.sortingOrder,
      accentedSort: state.accentedSort,
      suppressMultiSort: state.suppressMultiSort,
      quickFilterText: state.quickFilterText || undefined,
      cacheQuickFilter: state.cacheQuickFilter,
      enableAdvancedFilter: state.advancedFilterEnabled,
    };
  },

  transformColumnDefs(
    defs: (ColDef | ColGroupDef)[],
    state: SortFilterState,
    _ctx: GridContext,
  ): (ColDef | ColGroupDef)[] {
    if (!state.floatingFiltersEnabled) return defs;

    return defs.map((def) => {
      if ('children' in def && def.children) {
        return {
          ...def,
          children: sortFilterModule.transformColumnDefs!(def.children, state, _ctx),
        };
      }

      const colDef = def as ColDef;
      return {
        ...colDef,
        floatingFilter: state.floatingFiltersEnabled,
      };
    });
  },

  serialize: (state) => state,
  deserialize: (data) => ({
    ...INITIAL_SORT_FILTER,
    ...(data as Partial<SortFilterState>),
  }),

  SettingsPanel: SortFilterPanel,
};

export type { SortFilterState } from './state';
