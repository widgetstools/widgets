import React, { useCallback } from 'react';
import type { SettingsPanelProps } from '../../types/module';
import type { DataManagementState } from './state';
import { useModuleState } from '../../stores/useModuleState';
import { useGridCustomizerStore } from '../../ui/GridCustomizerContext';
import { TextField, NumberField, SelectField } from '../../ui/FormFields';

export function DataManagementPanel({ gridId }: SettingsPanelProps) {
  const store = useGridCustomizerStore();
  const [state, setState] = useModuleState<DataManagementState>(store, 'data-management');

  const update = useCallback(
    <K extends keyof DataManagementState>(key: K, value: DataManagementState[K]) => {
      setState((prev) => ({ ...prev, [key]: value }));
    },
    [setState],
  );

  const isServerModel = state.rowModelType === 'serverSide' || state.rowModelType === 'infinite';

  return (
    <div>
      <div className="gc-section">
        <div className="gc-section-title">Row Model</div>
        <SelectField
          label="Row Model Type"
          desc="Determines how data is loaded and managed"
          value={state.rowModelType}
          onChange={(v) => update('rowModelType', v as DataManagementState['rowModelType'])}
          options={[
            { value: 'clientSide', label: 'Client Side' },
            { value: 'serverSide', label: 'Server Side' },
            { value: 'infinite', label: 'Infinite' },
            { value: 'viewport', label: 'Viewport' },
          ]}
        />
      </div>

      <div className="gc-section">
        <div className="gc-section-title">Row Identity</div>
        <TextField
          label="Row ID Field"
          desc="Data field used as unique row identifier"
          value={state.getRowIdField}
          onChange={(v) => update('getRowIdField', v)}
          placeholder="id"
          mono
        />
      </div>

      <div className="gc-section">
        <div className="gc-section-title">Transaction & Buffering</div>
        <NumberField
          label="Async Transaction Wait (ms)"
          desc="Batching delay for async row transactions"
          value={state.asyncTransactionWaitMillis}
          onChange={(v) => update('asyncTransactionWaitMillis', v)}
          min={0}
          max={5000}
        />
        <NumberField
          label="Row Buffer"
          desc="Number of extra rows rendered outside visible area"
          value={state.rowBuffer}
          onChange={(v) => update('rowBuffer', v)}
          min={0}
          max={100}
        />
      </div>

      {isServerModel && (
        <div className="gc-section">
          <div className="gc-section-title">Cache Settings</div>
          <NumberField
            label="Cache Block Size"
            desc="Number of rows per cache block"
            value={state.cacheBlockSize}
            onChange={(v) => update('cacheBlockSize', v)}
            min={1}
            max={10000}
          />
          <NumberField
            label="Max Blocks in Cache"
            desc="Maximum cached blocks (-1 for unlimited)"
            value={state.maxBlocksInCache}
            onChange={(v) => update('maxBlocksInCache', v)}
            min={-1}
            max={1000}
          />
        </div>
      )}
    </div>
  );
}
