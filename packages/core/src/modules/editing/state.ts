export interface EditingState {
  editType: 'cell' | 'fullRow';
  singleClickEdit: boolean;
  stopEditingWhenCellsLoseFocus: boolean;
  enterMovesDown: boolean;
  enterMovesDownAfterEdit: boolean;
  undoRedoCellEditing: boolean;
  undoRedoCellEditingLimit: number;
}

export const INITIAL_EDITING: EditingState = {
  editType: 'cell',
  singleClickEdit: false,
  stopEditingWhenCellsLoseFocus: true,
  enterMovesDown: false,
  enterMovesDownAfterEdit: true,
  undoRedoCellEditing: true,
  undoRedoCellEditingLimit: 20,
};
