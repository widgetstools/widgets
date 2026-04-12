import React, { useCallback } from 'react';
import type { SettingsPanelProps } from '../../types/module';
import type { GeneralSettingsState } from './state';
import { useModuleState } from '../../stores/useModuleState';
import { useGridCustomizerStore } from '../../ui/GridCustomizerContext';
import { SwitchField, NumberField, SelectField } from '../../ui/FormFields';

export function GeneralSettingsPanel({ gridId }: SettingsPanelProps) {
  const store = useGridCustomizerStore();
  const [state, setState] = useModuleState<GeneralSettingsState>(store, 'general-settings');

  const update = useCallback(
    <K extends keyof GeneralSettingsState>(key: K, value: GeneralSettingsState[K]) => {
      setState((prev) => ({ ...prev, [key]: value }));
    },
    [setState],
  );

  return (
    <div>
      <div className="gc-section">
        <div className="gc-section-title">Grid Layout</div>
        <NumberField label="Row Height" value={state.rowHeight} onChange={(v) => update('rowHeight', v)} min={20} max={120} />
        <NumberField label="Header Height" value={state.headerHeight} onChange={(v) => update('headerHeight', v)} min={20} max={80} />
        <SwitchField label="Animate Rows" desc="Smooth transitions on sort/filter" checked={state.animateRows} onChange={(v) => update('animateRows', v)} />
        <SwitchField label="Suppress Row Hover" checked={state.suppressRowHoverHighlight} onChange={(v) => update('suppressRowHoverHighlight', v)} />
        <SwitchField label="Cell Text Selection" checked={state.enableCellTextSelection} onChange={(v) => update('enableCellTextSelection', v)} />
        <SwitchField label="Row Dragging" checked={state.rowDragging} onChange={(v) => update('rowDragging', v)} />
      </div>

      <div className="gc-section">
        <div className="gc-section-title">Row Selection</div>
        <SelectField
          label="Selection Mode"
          value={state.rowSelection ?? 'none'}
          onChange={(v) => update('rowSelection', v === 'none' ? undefined : v as any)}
          options={[
            { value: 'none', label: 'None' },
            { value: 'singleRow', label: 'Single Row' },
            { value: 'multiRow', label: 'Multi Row' },
          ]}
        />
        <SwitchField label="Checkbox Selection" checked={state.checkboxSelection} onChange={(v) => update('checkboxSelection', v)} />
      </div>

      <div className="gc-section">
        <div className="gc-section-title">Column Defaults</div>
        <SwitchField label="Resizable" checked={state.defaultResizable} onChange={(v) => update('defaultResizable', v)} />
        <SwitchField label="Sortable" checked={state.defaultSortable} onChange={(v) => update('defaultSortable', v)} />
        <SwitchField label="Filterable" checked={state.defaultFilterable} onChange={(v) => update('defaultFilterable', v)} />
        <SwitchField label="Editable" checked={state.defaultEditable} onChange={(v) => update('defaultEditable', v)} />
        <NumberField label="Min Width" value={state.defaultMinWidth} onChange={(v) => update('defaultMinWidth', v)} min={30} max={500} />
        <SwitchField label="Wrap Header Text" checked={state.wrapHeaderText} onChange={(v) => update('wrapHeaderText', v)} />
        <SwitchField label="Suppress Column Move" checked={state.suppressMovable} onChange={(v) => update('suppressMovable', v)} />
      </div>

      <div className="gc-section">
        <div className="gc-section-title">Pagination</div>
        <SwitchField label="Enable Pagination" checked={state.paginationEnabled} onChange={(v) => update('paginationEnabled', v)} />
        {state.paginationEnabled && (
          <>
            <NumberField label="Page Size" value={state.paginationPageSize} onChange={(v) => update('paginationPageSize', v)} min={10} max={10000} />
            <SwitchField label="Auto Page Size" checked={state.paginationAutoPageSize} onChange={(v) => update('paginationAutoPageSize', v)} />
            <SwitchField label="Suppress Pagination Panel" checked={state.suppressPaginationPanel} onChange={(v) => update('suppressPaginationPanel', v)} />
          </>
        )}
      </div>
    </div>
  );
}
