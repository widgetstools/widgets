import React, { useCallback } from 'react';
import type { SettingsPanelProps } from '../../types/module';
import type { EditingState } from './state';
import { useModuleState } from '../../stores/useModuleState';
import { useGridCustomizerStore } from '../../ui/GridCustomizerContext';
import { NumberField, SwitchField, SelectField } from '../../ui/FormFields';

export function EditingPanel({ gridId }: SettingsPanelProps) {
  const store = useGridCustomizerStore();
  const [state, setState] = useModuleState<EditingState>(store, 'editing');

  const update = useCallback(
    <K extends keyof EditingState>(key: K, value: EditingState[K]) => {
      setState((prev) => ({ ...prev, [key]: value }));
    },
    [setState],
  );

  return (
    <div>
      {/* Edit Mode */}
      <div className="gc-section">
        <div className="gc-section-title">Edit Mode</div>
        <SelectField
          label="Edit Type"
          desc="Cell editing or full-row editing mode"
          value={state.editType}
          onChange={(v) => update('editType', v as 'cell' | 'fullRow')}
          options={[
            { value: 'cell', label: 'Cell' },
            { value: 'fullRow', label: 'Full Row' },
          ]}
        />
        <SwitchField
          label="Single Click Edit"
          desc="Start editing with a single click instead of double"
          checked={state.singleClickEdit}
          onChange={(v) => update('singleClickEdit', v)}
        />
        <SwitchField
          label="Stop Editing on Focus Loss"
          desc="Finish editing when clicking outside the cell"
          checked={state.stopEditingWhenCellsLoseFocus}
          onChange={(v) => update('stopEditingWhenCellsLoseFocus', v)}
        />
      </div>

      {/* Navigation */}
      <div className="gc-section">
        <div className="gc-section-title">Navigation</div>
        <SwitchField
          label="Enter Moves Down"
          desc="Pressing Enter moves focus to the cell below"
          checked={state.enterMovesDown}
          onChange={(v) => update('enterMovesDown', v)}
        />
        <SwitchField
          label="Enter Moves Down After Edit"
          desc="Pressing Enter after editing moves focus down"
          checked={state.enterMovesDownAfterEdit}
          onChange={(v) => update('enterMovesDownAfterEdit', v)}
        />
      </div>

      {/* Undo / Redo */}
      <div className="gc-section">
        <div className="gc-section-title">Undo / Redo</div>
        <SwitchField
          label="Undo/Redo Cell Editing"
          desc="Enable Ctrl+Z / Ctrl+Y for cell edits"
          checked={state.undoRedoCellEditing}
          onChange={(v) => update('undoRedoCellEditing', v)}
        />
        {state.undoRedoCellEditing && (
          <NumberField
            label="Undo Limit"
            desc="Maximum number of undo steps"
            value={state.undoRedoCellEditingLimit}
            onChange={(v) => update('undoRedoCellEditingLimit', v)}
            min={1}
            max={100}
          />
        )}
      </div>
    </div>
  );
}
