import React, { useState, useCallback, useRef } from 'react';
import type { SettingsPanelProps } from '../../types/module';
import type { CalculatedColumnsState, CalculatedColumnDef } from './state';
import { useModuleState } from '../../stores/useModuleState';
import { useGridCustomizerStore } from '../../ui/GridCustomizerContext';
import { ExpressionEngine } from '../../expression';
import { Icons } from '../../ui/icons';
import { PropertySection, PropRow, PropText, PropNumber } from '../../ui/PropertyPanel';
import { Button } from '../../ui/shadcn/button';
import { Input } from '../../ui/shadcn/input';

const engine = new ExpressionEngine();

function generateId(): string {
  return `calc_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// ── Isolated Column Editor (local state, commits on blur/Enter) ──────────────

const ColumnEditor = React.memo(function ColumnEditor({
  col,
  onUpdate,
}: {
  col: CalculatedColumnDef;
  onUpdate: (patch: Partial<CalculatedColumnDef>) => void;
}) {
  // PropText and PropNumber handle local state + commit-on-blur internally.
  // Expression and formatter still use raw inputs for custom validation styling.
  const [expression, setExpression] = useState(col.expression);
  const [formatter, setFormatter] = useState(col.valueFormatterTemplate ?? '');

  const exprRef = useRef(col.expression);
  const fmtRef = useRef(col.valueFormatterTemplate ?? '');

  const commitExpression = useCallback(() => {
    if (expression !== exprRef.current) { exprRef.current = expression; onUpdate({ expression }); }
  }, [expression, onUpdate]);

  const commitFormatter = useCallback(() => {
    if (formatter !== fmtRef.current) {
      fmtRef.current = formatter;
      onUpdate({ valueFormatterTemplate: formatter || undefined });
    }
  }, [formatter, onUpdate]);

  const handleKeyDown = (commit: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commit();
  };

  return (
    <PropertySection title="Column Settings" defaultOpen>
      <PropRow label="Header Name">
        <PropText value={col.headerName} onChange={(v) => onUpdate({ headerName: v })} width={180} />
      </PropRow>
      <PropRow label="Expression" vertical>
        <Input className="font-mono text-[10px]" value={expression}
          onChange={(e) => setExpression(e.target.value)}
          onBlur={commitExpression} onKeyDown={handleKeyDown(commitExpression)}
          placeholder="{price} * {quantity}"
          error={!engine.validate(expression).valid}
          style={{ width: '100%' }} />
      </PropRow>
      <PropRow label="Value Formatter" vertical hint="optional">
        <Input className="font-mono text-[10px]" value={formatter}
          onChange={(e) => setFormatter(e.target.value)}
          onBlur={commitFormatter} onKeyDown={handleKeyDown(commitFormatter)}
          placeholder="ROUND(x, 2)" style={{ width: '100%' }} />
      </PropRow>
      <PropRow label="Initial Width">
        <PropNumber value={col.initialWidth ?? ''} onChange={(n) => onUpdate({ initialWidth: n || undefined })} min={30} placeholder="auto" />
      </PropRow>
    </PropertySection>
  );
});

export function CalculatedColumnsPanel({ gridId }: SettingsPanelProps) {
  const store = useGridCustomizerStore();
  const [state, setState] = useModuleState<CalculatedColumnsState>(store, 'calculated-columns');
  const [editingId, setEditingId] = useState<string | null>(null);

  const addColumn = useCallback(() => {
    const col: CalculatedColumnDef = {
      colId: generateId(),
      headerName: 'New Column',
      expression: '{price} * {quantity}',
    };
    setState((prev) => ({ ...prev, columns: [...prev.columns, col] }));
    setEditingId(col.colId);
  }, [setState]);

  const updateColumn = useCallback(
    (colId: string, patch: Partial<CalculatedColumnDef>) => {
      setState((prev) => ({
        ...prev,
        columns: prev.columns.map((c) => (c.colId === colId ? { ...c, ...patch } : c)),
      }));
    },
    [setState],
  );

  const removeColumn = useCallback(
    (colId: string) => {
      setState((prev) => ({ ...prev, columns: prev.columns.filter((c) => c.colId !== colId) }));
      if (editingId === colId) setEditingId(null);
    },
    [setState, editingId],
  );

  const editingCol = editingId ? state.columns.find((c) => c.colId === editingId) : null;

  return (
    <div>
      <div className="gc-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="gc-section-title" style={{ margin: 0, border: 'none', paddingBottom: 0 }}>
            Calculated Columns ({state.columns.length})
          </div>
          <Button variant="default" size="sm" onClick={addColumn}>
            <Icons.Plus size={12} /> Add Column
          </Button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--gc-text-dim)', marginBottom: 12 }}>
          Virtual columns computed from expressions. Use <code style={{ fontFamily: 'var(--gc-font-mono)' }}>{'{columnId}'}</code> to reference other columns.
        </p>

        {state.columns.length === 0 ? (
          <div className="gc-empty">No calculated columns</div>
        ) : (
          state.columns.map((col) => {
            const valid = engine.validate(col.expression);
            return (
              <div
                key={col.colId}
                className="gc-rule-card"
                style={{ cursor: 'pointer' }}
                onClick={() => setEditingId(editingId === col.colId ? null : col.colId)}
              >
                <div className="gc-rule-card-header">
                  <div className="gc-rule-card-title">{col.headerName}</div>
                  {!valid.valid && <span style={{ fontSize: 10, color: 'var(--gc-danger)' }}>Error</span>}
                  <Button
                    variant="ghost" size="icon-sm"
                    onClick={(e) => { e.stopPropagation(); removeColumn(col.colId); }}
                  >
                    <Icons.Trash size={12} />
                  </Button>
                </div>
                <div className="gc-rule-card-body">
                  <code style={{ fontFamily: 'var(--gc-font-mono)', fontSize: 11 }}>{col.expression}</code>
                </div>
              </div>
            );
          })
        )}
      </div>

      {editingCol && (
        <ColumnEditor
          key={editingId}
          col={editingCol}
          onUpdate={(patch) => updateColumn(editingCol.colId, patch)}
        />
      )}
    </div>
  );
}
