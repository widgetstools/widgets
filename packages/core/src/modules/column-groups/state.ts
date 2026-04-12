export interface ColumnGroupConfig {
  groupId: string;
  headerName: string;
  children: string[]; // colId strings
  openByDefault: boolean;
  marryChildren: boolean;
}

export interface ColumnGroupsState {
  groups: ColumnGroupConfig[];
}

export const INITIAL_COLUMN_GROUPS: ColumnGroupsState = {
  groups: [],
};
