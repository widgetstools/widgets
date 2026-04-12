import type { ColDef, ColGroupDef, GridOptions } from 'ag-grid-community';
import type { GridCustomizerModule } from '../../types/module';
import type { GridContext } from '../../types/common';
import { INITIAL_GENERAL_SETTINGS, type GeneralSettingsState } from './state';
import { GeneralSettingsPanel } from './GeneralSettingsPanel';

export const generalSettingsModule: GridCustomizerModule<GeneralSettingsState> = {
  id: 'general-settings',
  name: 'General Settings',
  icon: 'Settings',
  priority: 0,

  getInitialState: () => ({ ...INITIAL_GENERAL_SETTINGS }),

  transformGridOptions(
    opts: Partial<GridOptions>,
    state: GeneralSettingsState,
    _ctx: GridContext,
  ): Partial<GridOptions> {
    return {
      ...opts,
      rowHeight: state.rowHeight,
      headerHeight: state.headerHeight,
      rowSelection: state.rowSelection ? { mode: state.rowSelection } : undefined,
      rowDragManaged: state.rowDragging,
      animateRows: state.animateRows,
      suppressRowHoverHighlight: state.suppressRowHoverHighlight,
      enableCellTextSelection: state.enableCellTextSelection,
      suppressDragLeaveHidesColumns: state.suppressDragLeaveHidesColumns,
      suppressColumnMoveAnimation: state.suppressColumnMoveAnimation,
      pagination: state.paginationEnabled,
      paginationPageSize: state.paginationEnabled ? state.paginationPageSize : undefined,
      paginationAutoPageSize: state.paginationEnabled ? state.paginationAutoPageSize : undefined,
      suppressPaginationPanel: state.paginationEnabled ? state.suppressPaginationPanel : undefined,
      defaultColDef: {
        ...opts.defaultColDef,
        resizable: state.defaultResizable,
        sortable: state.defaultSortable,
        filter: state.defaultFilterable,
        editable: state.defaultEditable,
        minWidth: state.defaultMinWidth,
        maxWidth: state.defaultMaxWidth,
        wrapHeaderText: state.wrapHeaderText,
        suppressMovable: state.suppressMovable,
      },
    };
  },

  serialize: (state) => state,
  deserialize: (data) => ({ ...INITIAL_GENERAL_SETTINGS, ...(data as Partial<GeneralSettingsState>) }),

  SettingsPanel: GeneralSettingsPanel,
};

export type { GeneralSettingsState } from './state';
