import type { GridOptions } from 'ag-grid-community';
import type { GridCustomizerModule } from '../../types/module';
import type { GridContext } from '../../types/common';
import { INITIAL_EDITING, type EditingState } from './state';
import { EditingPanel } from './EditingPanel';

export const editingModule: GridCustomizerModule<EditingState> = {
  id: 'editing',
  name: 'Editing',
  icon: 'Edit',
  priority: 45,

  getInitialState: () => ({ ...INITIAL_EDITING }),

  transformGridOptions(
    opts: Partial<GridOptions>,
    state: EditingState,
    _ctx: GridContext,
  ): Partial<GridOptions> {
    return {
      ...opts,
      editType: state.editType === 'fullRow' ? 'fullRow' : 'singleCell',
      singleClickEdit: state.singleClickEdit,
      stopEditingWhenCellsLoseFocus: state.stopEditingWhenCellsLoseFocus,
      enterNavigatesVertically: state.enterMovesDown,
      enterNavigatesVerticallyAfterEdit: state.enterMovesDownAfterEdit,
      undoRedoCellEditing: state.undoRedoCellEditing,
      undoRedoCellEditingLimit: state.undoRedoCellEditing
        ? state.undoRedoCellEditingLimit
        : undefined,
    };
  },

  serialize: (state) => state,
  deserialize: (data) => ({
    ...INITIAL_EDITING,
    ...(data as Partial<EditingState>),
  }),

  SettingsPanel: EditingPanel,
};

export type { EditingState } from './state';
