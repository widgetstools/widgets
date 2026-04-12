import type { GridOptions } from 'ag-grid-community';
import type { GridCustomizerModule } from '../../types/module';
import type { GridContext } from '../../types/common';
import { INITIAL_EXPORT_CLIPBOARD, type ExportClipboardState } from './state';
import { ExportClipboardPanel } from './ExportClipboardPanel';

export const exportClipboardModule: GridCustomizerModule<ExportClipboardState> = {
  id: 'export-clipboard',
  name: 'Export & Clipboard',
  icon: 'Download',
  priority: 75,

  getInitialState: () => ({ ...INITIAL_EXPORT_CLIPBOARD }),

  transformGridOptions(
    opts: Partial<GridOptions>,
    state: ExportClipboardState,
    _ctx: GridContext,
  ): Partial<GridOptions> {
    return {
      ...opts,
      defaultCsvExportParams: {
        fileName: state.csvFileName,
        columnSeparator: state.csvSeparator,
        skipColumnHeaders: !state.includeHeaders,
      },
      defaultExcelExportParams: {
        fileName: state.excelFileName,
        sheetName: state.excelSheetName,
        skipColumnHeaders: !state.includeHeaders,
      },
      suppressCsvExport: state.suppressCsvExport,
      suppressExcelExport: state.suppressExcelExport,
    };
  },

  serialize: (state) => state,
  deserialize: (data) => ({
    ...INITIAL_EXPORT_CLIPBOARD,
    ...(data as Partial<ExportClipboardState>),
  }),

  SettingsPanel: ExportClipboardPanel,
};

export type { ExportClipboardState } from './state';
