export interface CalculatedColumnDef {
  colId: string;
  headerName: string;
  expression: string;
  valueFormatterTemplate?: string;
  position?: number;
  initialWidth?: number;
  initialHide?: boolean;
  initialPinned?: 'left' | 'right' | boolean;
}

export interface CalculatedColumnsState {
  columns: CalculatedColumnDef[];
}

export const INITIAL_CALCULATED_COLUMNS: CalculatedColumnsState = {
  columns: [],
};
