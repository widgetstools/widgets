import type { ColDef, ColGroupDef, GridReadyEvent, SideBarDef, StatusPanelDef } from 'ag-grid-community';
import type { AnyModule } from '@grid-customizer/core';

export interface MarketsGridProps<TData = any> {
  // Required
  rowData: TData[];
  columnDefs: (ColDef<TData> | ColGroupDef)[];
  theme: any; // themeQuartz.withParams() result

  // Grid identity
  gridId?: string;
  rowIdField?: string;

  // Feature toggles
  modules?: AnyModule[];
  showToolbar?: boolean;
  showSettingsButton?: boolean;
  persistState?: boolean;

  // AG-Grid passthrough
  rowHeight?: number;
  headerHeight?: number;
  animateRows?: boolean;
  sideBar?: SideBarDef | boolean;
  statusBar?: { statusPanels: StatusPanelDef[] };
  defaultColDef?: ColDef;
  onGridReady?: (event: GridReadyEvent) => void;

  // Style
  className?: string;
  style?: React.CSSProperties;
}
