export interface UndoRedoState {
  enabled: boolean;
  limit: number;
}

export const INITIAL_UNDO_REDO: UndoRedoState = {
  enabled: true,
  limit: 20,
};
