import React, { useCallback } from 'react';
import type { SettingsPanelProps } from '../../types/module';
import type { UndoRedoState } from './state';
import { useModuleState } from '../../stores/useModuleState';
import { useGridCustomizerStore } from '../../ui/GridCustomizerContext';
import { NumberField, SwitchField } from '../../ui/FormFields';

export function UndoRedoPanel({ gridId }: SettingsPanelProps) {
  const store = useGridCustomizerStore();
  const [state, setState] = useModuleState<UndoRedoState>(store, 'undo-redo');

  const update = useCallback(
    <K extends keyof UndoRedoState>(key: K, value: UndoRedoState[K]) => {
      setState((prev) => ({ ...prev, [key]: value }));
    },
    [setState],
  );

  return (
    <div>
      <div className="gc-section">
        <div className="gc-section-title">Undo / Redo</div>

        <SwitchField
          label="Enable Undo/Redo"
          desc="Allow Ctrl+Z / Ctrl+Y for cell edits"
          checked={state.enabled}
          onChange={(v) => update('enabled', v)}
        />

        {state.enabled && (
          <NumberField
            label="History Limit"
            desc="Maximum number of undo steps"
            value={state.limit}
            onChange={(v) => update('limit', v)}
            min={1}
            max={200}
          />
        )}
      </div>

      <div className="gc-section">
        <div className="gc-section-title">Info</div>
        <div style={{ fontSize: 12, color: 'var(--gc-text-dim)', lineHeight: 1.5 }}>
          <p style={{ margin: '0 0 8px' }}>
            When enabled, AG-Grid tracks cell value changes and allows undoing/redoing them
            via keyboard shortcuts (<code style={{ fontFamily: 'var(--gc-font-mono)' }}>Ctrl+Z</code> / <code style={{ fontFamily: 'var(--gc-font-mono)' }}>Ctrl+Y</code>).
          </p>
          <p style={{ margin: '0 0 8px' }}>
            <strong>What is tracked:</strong> Individual cell edits, paste operations, and fill handle changes.
          </p>
          <p style={{ margin: 0 }}>
            <strong>Not tracked:</strong> Programmatic value changes via the API, row additions/removals, and sorting/filtering state.
          </p>
        </div>
      </div>
    </div>
  );
}
