import type { GridOptions, GetRowIdParams } from 'ag-grid-community';
import type { GridCustomizerModule } from '../../types/module';
import type { GridContext } from '../../types/common';
import { INITIAL_DATA_MANAGEMENT, type DataManagementState } from './state';
import { DataManagementPanel } from './DataManagementPanel';

export const dataManagementModule: GridCustomizerModule<DataManagementState> = {
  id: 'data-management',
  name: 'Data Management',
  icon: 'Database',
  priority: 70,

  getInitialState: () => ({ ...INITIAL_DATA_MANAGEMENT }),

  transformGridOptions(
    opts: Partial<GridOptions>,
    state: DataManagementState,
    _ctx: GridContext,
  ): Partial<GridOptions> {
    const field = state.getRowIdField;

    const result: Partial<GridOptions> = {
      ...opts,
      rowModelType: state.rowModelType,
      getRowId: field
        ? (params: GetRowIdParams) => String(params.data?.[field] ?? '')
        : undefined,
      asyncTransactionWaitMillis: state.asyncTransactionWaitMillis,
      rowBuffer: state.rowBuffer,
    };

    // Cache settings are only relevant for serverSide / infinite models
    if (state.rowModelType === 'serverSide' || state.rowModelType === 'infinite') {
      result.cacheBlockSize = state.cacheBlockSize;
      result.maxBlocksInCache = state.maxBlocksInCache >= 0 ? state.maxBlocksInCache : undefined;
    }

    return result;
  },

  serialize: (state) => state,
  deserialize: (data) => ({
    ...INITIAL_DATA_MANAGEMENT,
    ...(data as Partial<DataManagementState>),
  }),

  SettingsPanel: DataManagementPanel,
};

export type { DataManagementState } from './state';
