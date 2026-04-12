import type { GridOptions } from 'ag-grid-community';
import type { GridCustomizerModule } from '../../types/module';
import type { GridContext } from '../../types/common';
import { INITIAL_UNDO_REDO, type UndoRedoState } from './state';
import { UndoRedoPanel } from './UndoRedoPanel';

export const undoRedoModule: GridCustomizerModule<UndoRedoState> = {
  id: 'undo-redo',
  name: 'Undo / Redo',
  icon: 'Undo',
  priority: 65,

  getInitialState: () => ({ ...INITIAL_UNDO_REDO }),

  transformGridOptions(
    opts: Partial<GridOptions>,
    state: UndoRedoState,
    _ctx: GridContext,
  ): Partial<GridOptions> {
    return {
      ...opts,
      undoRedoCellEditing: state.enabled,
      undoRedoCellEditingLimit: state.enabled ? state.limit : undefined,
    };
  },

  serialize: (state) => state,
  deserialize: (data) => ({
    ...INITIAL_UNDO_REDO,
    ...(data as Partial<UndoRedoState>),
  }),

  SettingsPanel: UndoRedoPanel,
};

export type { UndoRedoState } from './state';
