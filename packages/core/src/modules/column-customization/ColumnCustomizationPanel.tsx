import React, { useState, useCallback, useMemo } from 'react';
import type { SettingsPanelProps } from '../../types/module';
import type { ColumnCustomizationState } from './state';
import type { ColumnAssignment, ColumnTemplate } from '../../types/common';
import { useModuleState } from '../../stores/useModuleState';
import { useGridCustomizerStore } from '../../ui/GridCustomizerContext';
import { Icons } from '../../ui/icons';
import { TextField, NumberField, SelectField, SwitchField } from '../../ui/FormFields';
import { ColumnPickerSingle, useGridColumns, type GridColumnInfo } from '../../ui/ColumnPicker';
import { Button } from '../../ui/shadcn/button';

// ─── Column Editor (identity + template picker, NO style editing) ────────────

const ColumnEditor = React.memo(function ColumnEditor({
  colId,
  assignment,
  templates,
  onUpdate,
  onGoToTemplate,
}: {
  colId: string;
  assignment: ColumnAssignment;
  templates: Record<string, ColumnTemplate>;
  onUpdate: (patch: Partial<ColumnAssignment>) => void;
  onGoToTemplate: (tplId: string) => void;
}) {
  const tpl = assignment.templateId ? templates[assignment.templateId] : undefined;

  const templateOptions = useMemo(() => [
    { value: '', label: 'None' },
    ...Object.values(templates).map((t) => ({ value: t.id, label: t.name })),
  ], [templates]);

  return (
    <div className="gc-section">
      <div className="gc-section-title">Column: {assignment.headerName ?? colId}</div>

      {/* Column-specific properties — these can never be in a template */}
      <TextField label="Header Name" value={assignment.headerName ?? ''} placeholder={colId}
        onChange={(v) => onUpdate({ headerName: v || undefined })} />
      <NumberField label="Initial Width" value={assignment.initialWidth} placeholder="auto"
        onChange={(v) => onUpdate({ initialWidth: v })} min={30} />
      <SelectField label="Pin"
        value={assignment.initialPinned === true ? 'left' : (assignment.initialPinned as string) ?? 'none'}
        onChange={(v) => onUpdate({ initialPinned: v === 'none' ? undefined : v as 'left' | 'right' })}
        options={[{ value: 'none', label: 'None' }, { value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }]} />
      <SwitchField label="Hidden" checked={assignment.initialHide ?? false}
        onChange={(v) => onUpdate({ initialHide: v })} />

      <div style={{ height: 1, background: 'var(--gc-border)', margin: '8px 0' }} />

      {/* Template assignment */}
      <SelectField label="Style Template" value={assignment.templateId ?? ''}
        onChange={(v) => onUpdate({ templateId: v || undefined })}
        options={templateOptions} />

      {tpl ? (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 10px', marginTop: 6, borderRadius: 4,
          background: 'var(--gc-accent-muted)', border: '1px solid rgba(240,185,11,0.15)',
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--gc-text)' }}>{tpl.name}</div>
            {tpl.description && <div style={{ fontSize: 9, color: 'var(--gc-text-dim)', marginTop: 2 }}>{tpl.description}</div>}
          </div>
          <Button variant="outline" size="sm" onClick={() => onGoToTemplate(tpl.id)}>
            Edit Template →
          </Button>
        </div>
      ) : (
        <div style={{ fontSize: 10, color: 'var(--gc-text-dim)', marginTop: 6, padding: '6px 10px', background: 'var(--gc-surface-hover)', borderRadius: 4 }}>
          No template assigned. Go to the <strong>Templates</strong> tab to create one.
        </div>
      )}
    </div>
  );
});

// ─── Main Panel ──────────────────────────────────────────────────────────────

export function ColumnCustomizationPanel({ gridId }: SettingsPanelProps) {
  const store = useGridCustomizerStore();
  const gridColumns = useGridColumns();
  const [state, setState] = useModuleState<ColumnCustomizationState>(store, 'column-customization');
  const [selectedColId, setSelectedColId] = useState<string | null>(null);

  // Read templates from the column-templates module
  const templatesState = store.getState().modules['column-templates'] as { templates: Record<string, ColumnTemplate> } | undefined;
  const templates = templatesState?.templates ?? {};

  const assignedColIds = Object.keys(state.assignments);
  const excludeSet = useMemo(() => new Set(assignedColIds), [assignedColIds]);
  const selectedAssignment = selectedColId ? state.assignments[selectedColId] : null;

  const addAssignment = useCallback((col: GridColumnInfo) => {
    setState((prev) => ({
      ...prev,
      assignments: { ...prev.assignments, [col.colId]: { colId: col.colId, headerName: col.headerName } },
    }));
    setSelectedColId(col.colId);
  }, [setState]);

  const updateAssignment = useCallback((colId: string, patch: Partial<ColumnAssignment>) => {
    setState((prev) => ({
      ...prev,
      assignments: { ...prev.assignments, [colId]: { ...prev.assignments[colId], ...patch } },
    }));
  }, [setState]);

  const removeAssignment = useCallback((colId: string) => {
    setState((prev) => {
      const { [colId]: _, ...rest } = prev.assignments;
      return { ...prev, assignments: rest };
    });
    if (selectedColId === colId) setSelectedColId(null);
  }, [setState, selectedColId]);

  // Navigate to Templates tab
  const goToTemplate = useCallback((tplId: string) => {
    store.getState().setActiveSettingsModule('column-templates');
  }, [store]);

  return (
    <div>
      <div className="gc-section">
        <p style={{ fontSize: 10, color: 'var(--gc-text-dim)', marginBottom: 8 }}>
          Set column name, width, and position. Assign a style template for appearance.
        </p>
        <ColumnPickerSingle placeholder="Add column to customize..." excludeIds={excludeSet} onSelect={addAssignment} />

        {assignedColIds.length > 0 && (
          <div style={{ marginTop: 10 }}>
            {assignedColIds.map((colId) => {
              const a = state.assignments[colId];
              const tpl = a.templateId ? templates[a.templateId] : undefined;
              return (
                <div key={colId} className="gc-col-item" data-active={selectedColId === colId}
                  onClick={() => setSelectedColId(selectedColId === colId ? null : colId)}>
                  <div className="gc-col-dot" />
                  <span style={{ flex: 1, fontWeight: 500 }}>{a.headerName ?? colId}</span>
                  {tpl && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'var(--gc-accent-muted)', color: 'var(--gc-accent)' }}>{tpl.name}</span>}
                  {a.initialPinned && <span style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, background: 'var(--gc-accent-muted)', color: 'var(--gc-accent)' }}>PIN</span>}
                  <Button variant="ghost" size="icon-sm"
                    onClick={(e) => { e.stopPropagation(); removeAssignment(colId); }}>
                    <Icons.Trash size={11} />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {assignedColIds.length === 0 && (
          <div className="gc-empty">No columns customized. Search above to add one.</div>
        )}
      </div>

      {selectedColId && selectedAssignment && (
        <ColumnEditor
          key={selectedColId}
          colId={selectedColId}
          assignment={selectedAssignment}
          templates={templates}
          onUpdate={(patch) => updateAssignment(selectedColId, patch)}
          onGoToTemplate={goToTemplate}
        />
      )}
    </div>
  );
}
