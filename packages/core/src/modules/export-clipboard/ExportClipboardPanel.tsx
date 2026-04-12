import React, { useCallback } from 'react';
import type { SettingsPanelProps } from '../../types/module';
import type { ExportClipboardState } from './state';
import { useModuleState } from '../../stores/useModuleState';
import { useGridCustomizerStore } from '../../ui/GridCustomizerContext';
import { TextField, SwitchField, SelectField } from '../../ui/FormFields';

export function ExportClipboardPanel({ gridId }: SettingsPanelProps) {
  const store = useGridCustomizerStore();
  const [state, setState] = useModuleState<ExportClipboardState>(store, 'export-clipboard');

  const update = useCallback(
    <K extends keyof ExportClipboardState>(key: K, value: ExportClipboardState[K]) => {
      setState((prev) => ({ ...prev, [key]: value }));
    },
    [setState],
  );

  return (
    <div>
      <div className="gc-section">
        <div className="gc-section-title">CSV Export</div>

        <SwitchField
          label="Suppress CSV Export"
          desc="Disable CSV export from the context menu"
          checked={state.suppressCsvExport}
          onChange={(v) => update('suppressCsvExport', v)}
        />

        {!state.suppressCsvExport && (
          <>
            <TextField
              label="File Name"
              desc="Default file name for CSV exports"
              value={state.csvFileName}
              onChange={(v) => update('csvFileName', v)}
              placeholder="export.csv"
              mono
            />

            <SelectField
              label="Separator"
              desc="Column separator character"
              value={state.csvSeparator}
              onChange={(v) => update('csvSeparator', v)}
              options={[
                { value: ',', label: ',  (comma)' },
                { value: ';', label: '; (semicolon)' },
                { value: '\t', label: '\t (tab)' },
                { value: '|', label: '| (pipe)' },
              ]}
            />
          </>
        )}
      </div>

      <div className="gc-section">
        <div className="gc-section-title">Excel Export</div>

        <SwitchField
          label="Suppress Excel Export"
          desc="Disable Excel export from the context menu"
          checked={state.suppressExcelExport}
          onChange={(v) => update('suppressExcelExport', v)}
        />

        {!state.suppressExcelExport && (
          <>
            <TextField
              label="File Name"
              desc="Default file name for Excel exports"
              value={state.excelFileName}
              onChange={(v) => update('excelFileName', v)}
              placeholder="export.xlsx"
              mono
            />

            <TextField
              label="Sheet Name"
              desc="Default worksheet name"
              value={state.excelSheetName}
              onChange={(v) => update('excelSheetName', v)}
              placeholder="Sheet1"
              mono
            />
          </>
        )}
      </div>

      <div className="gc-section">
        <div className="gc-section-title">General</div>

        <SwitchField
          label="Include Headers"
          desc="Include column headers in exports"
          checked={state.includeHeaders}
          onChange={(v) => update('includeHeaders', v)}
        />
      </div>
    </div>
  );
}
