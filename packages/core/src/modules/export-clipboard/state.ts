export interface ExportClipboardState {
  csvFileName: string;
  csvSeparator: string;
  includeHeaders: boolean;
  excelFileName: string;
  excelSheetName: string;
  suppressCsvExport: boolean;
  suppressExcelExport: boolean;
}

export const INITIAL_EXPORT_CLIPBOARD: ExportClipboardState = {
  csvFileName: 'export.csv',
  csvSeparator: ',',
  includeHeaders: true,
  excelFileName: 'export.xlsx',
  excelSheetName: 'Sheet1',
  suppressCsvExport: false,
  suppressExcelExport: false,
};
