import React, { useState, useCallback, useRef } from 'react';
import type { SettingsPanelProps } from '../../types/module';
import type { NamedQueriesState, NamedQuery, QueryCondition } from './state';
import { useModuleState } from '../../stores/useModuleState';
import { useGridCustomizerStore } from '../../ui/GridCustomizerContext';
import { Icons } from '../../ui/icons';
import { ColumnPickerSingle } from '../../ui/ColumnPicker';
import { PropertySection, PropRow, PropSwitch, PropSelect, PropText } from '../../ui/PropertyPanel';
import { Button } from '../../ui/shadcn/button';
import { Input } from '../../ui/shadcn/input';
import { Select } from '../../ui/shadcn/select';
import { Switch } from '../../ui/shadcn/switch';

const OPERATORS: Array<{ value: QueryCondition['operator']; label: string }> = [
  { value: 'equals', label: 'Equals' },
  { value: 'notEquals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'startsWith', label: 'Starts With' },
  { value: 'endsWith', label: 'Ends With' },
  { value: 'greaterThan', label: 'Greater Than' },
  { value: 'lessThan', label: 'Less Than' },
  { value: 'greaterThanOrEqual', label: '>= (GTE)' },
  { value: 'lessThanOrEqual', label: '<= (LTE)' },
  { value: 'inRange', label: 'In Range' },
  { value: 'blank', label: 'Blank' },
  { value: 'notBlank', label: 'Not Blank' },
];

function generateId(): string {
  return `q${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function createEmptyCondition(): QueryCondition {
  return { column: '', operator: 'equals', value: '' };
}

// ── Inline text input with local state (for condition fields) ────────────────

const LocalInput = React.memo(function LocalInput({
  value,
  onChange,
  className,
  style,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
}) {
  const [local, setLocal] = useState(value);
  const committed = useRef(value);

  const commit = useCallback(() => {
    if (local !== committed.current) {
      committed.current = local;
      onChange(local);
    }
  }, [local, onChange]);

  return (
    <Input
      className={className}
      style={style}
      placeholder={placeholder}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
    />
  );
});

// ── Isolated Query Editor (local state, commits on blur/Enter) ───────────────

const QueryEditor = React.memo(function QueryEditor({
  query,
  onUpdate,
  onUpdateCondition,
  onAddCondition,
  onRemoveCondition,
}: {
  query: NamedQuery;
  onUpdate: (patch: Partial<NamedQuery>) => void;
  onUpdateCondition: (condIndex: number, patch: Partial<QueryCondition>) => void;
  onAddCondition: () => void;
  onRemoveCondition: (condIndex: number) => void;
}) {
  // PropText handles local state + commit-on-blur for name and description.
  // Expression still uses raw input for potential custom styling.
  const [expression, setExpression] = useState(query.expression ?? '');
  const exprRef = useRef(query.expression ?? '');

  const commitExpression = useCallback(() => {
    if (expression !== exprRef.current) { exprRef.current = expression; onUpdate({ expression }); }
  }, [expression, onUpdate]);

  const handleKeyDown = (commit: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commit();
  };

  return (
    <div>
      <PropertySection title="Query Settings" defaultOpen>
        <PropRow label="Name">
          <PropText value={query.name} onChange={(v) => onUpdate({ name: v })} width={200} />
        </PropRow>
        <PropRow label="Description">
          <PropText value={query.description ?? ''} onChange={(v) => onUpdate({ description: v || undefined })} placeholder="Optional description" width={260} />
        </PropRow>
        <PropRow label="Combinator">
          <PropSelect
            value={query.combinator}
            onChange={(v) => onUpdate({ combinator: v as 'AND' | 'OR' })}
            options={[
              { value: 'AND', label: 'AND (all must match)' },
              { value: 'OR', label: 'OR (any must match)' },
            ]}
          />
        </PropRow>
        <PropRow label="Expression Mode">
          <PropSwitch checked={query.expressionMode} onChange={(v) => onUpdate({ expressionMode: v })} />
        </PropRow>
      </PropertySection>

      <PropertySection title="Conditions" defaultOpen>
        {query.expressionMode ? (
          <PropRow label="Expression" vertical>
            <Input
              className="font-mono text-[10px]"
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              onBlur={commitExpression}
              onKeyDown={handleKeyDown(commitExpression)}
              placeholder="data.price > 100 AND data.status == 'active'"
              style={{ width: '100%' }}
            />
            <div style={{ fontSize: 10, color: 'var(--gc-text-dim)', marginTop: 4 }}>
              Use <code style={{ fontFamily: 'var(--gc-font-mono)' }}>data.field</code> to reference row data fields
            </div>
          </PropRow>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 'var(--gc-font-sm, 11px)', color: 'var(--gc-text)' }}>
                {query.conditions.length} condition{query.conditions.length !== 1 ? 's' : ''}
              </span>
              <Button variant="ghost" size="sm" onClick={onAddCondition}>
                <Icons.Plus size={12} /> Add
              </Button>
            </div>

            {query.conditions.map((cond, idx) => (
              <div
                key={idx}
                className="gc-rule-card"
                style={{ padding: 8, marginBottom: 6 }}
              >
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ width: 140 }}>
                    <ColumnPickerSingle
                      placeholder={cond.column || 'Column...'}
                      onSelect={(col) => onUpdateCondition(idx, { column: col.colId })}
                    />
                  </div>
                  <Select
                    style={{ fontSize: 11 }}
                    value={cond.operator}
                    onChange={(e) =>
                      onUpdateCondition(idx, {
                        operator: e.target.value as QueryCondition['operator'],
                      })
                    }
                  >
                    {OPERATORS.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </Select>
                  {cond.operator !== 'blank' && cond.operator !== 'notBlank' && (
                    <LocalInput
                      className="w-20 text-right"
                      style={{ width: 90 }}
                      placeholder="Value"
                      value={cond.value}
                      onChange={(v) => onUpdateCondition(idx, { value: v })}
                    />
                  )}
                  {cond.operator === 'inRange' && (
                    <LocalInput
                      className="w-20 text-right"
                      style={{ width: 90 }}
                      placeholder="To value"
                      value={cond.valueTo ?? ''}
                      onChange={(v) => onUpdateCondition(idx, { valueTo: v })}
                    />
                  )}
                  <Button
                    variant="ghost" size="icon-sm"
                    onClick={() => onRemoveCondition(idx)}
                    disabled={query.conditions.length <= 1}
                  >
                    <Icons.X size={12} />
                  </Button>
                </div>
              </div>
            ))}
          </>
        )}
      </PropertySection>
    </div>
  );
});

export function NamedQueriesPanel({ gridId }: SettingsPanelProps) {
  const store = useGridCustomizerStore();
  const [state, setState] = useModuleState<NamedQueriesState>(store, 'named-queries');
  const [editingId, setEditingId] = useState<string | null>(null);

  const activeCount = state.activeQueryIds.length;

  const addQuery = useCallback(() => {
    const newQuery: NamedQuery = {
      id: generateId(),
      name: 'New Query',
      enabled: true,
      combinator: 'AND',
      conditions: [createEmptyCondition()],
      expressionMode: false,
    };
    setState((prev) => ({ ...prev, queries: [...prev.queries, newQuery] }));
    setEditingId(newQuery.id);
  }, [setState]);

  const updateQuery = useCallback(
    (queryId: string, patch: Partial<NamedQuery>) => {
      setState((prev) => ({
        ...prev,
        queries: prev.queries.map((q) => (q.id === queryId ? { ...q, ...patch } : q)),
      }));
    },
    [setState],
  );

  const removeQuery = useCallback(
    (queryId: string) => {
      setState((prev) => ({
        ...prev,
        queries: prev.queries.filter((q) => q.id !== queryId),
        activeQueryIds: prev.activeQueryIds.filter((id) => id !== queryId),
      }));
      if (editingId === queryId) setEditingId(null);
    },
    [setState, editingId],
  );

  const toggleActive = useCallback(
    (queryId: string) => {
      setState((prev) => {
        const isActive = prev.activeQueryIds.includes(queryId);
        return {
          ...prev,
          activeQueryIds: isActive
            ? prev.activeQueryIds.filter((id) => id !== queryId)
            : [...prev.activeQueryIds, queryId],
        };
      });
    },
    [setState],
  );

  const updateCondition = useCallback(
    (queryId: string, condIndex: number, patch: Partial<QueryCondition>) => {
      setState((prev) => ({
        ...prev,
        queries: prev.queries.map((q) => {
          if (q.id !== queryId) return q;
          const conditions = q.conditions.map((c, i) =>
            i === condIndex ? { ...c, ...patch } : c,
          );
          return { ...q, conditions };
        }),
      }));
    },
    [setState],
  );

  const addCondition = useCallback(
    (queryId: string) => {
      setState((prev) => ({
        ...prev,
        queries: prev.queries.map((q) =>
          q.id === queryId ? { ...q, conditions: [...q.conditions, createEmptyCondition()] } : q,
        ),
      }));
    },
    [setState],
  );

  const removeCondition = useCallback(
    (queryId: string, condIndex: number) => {
      setState((prev) => ({
        ...prev,
        queries: prev.queries.map((q) => {
          if (q.id !== queryId) return q;
          return { ...q, conditions: q.conditions.filter((_, i) => i !== condIndex) };
        }),
      }));
    },
    [setState],
  );

  const editingQuery = editingId ? state.queries.find((q) => q.id === editingId) : null;

  return (
    <div>
      {/* Quick Filter & Filter Options */}
      <PropertySection title="Filter Settings" defaultOpen>
        <PropRow label="Quick Filter" vertical>
          <PropText
            value={state.quickFilterText}
            onChange={(v) => setState((prev) => ({ ...prev, quickFilterText: v }))}
            placeholder="Type to filter all columns..."
          />
        </PropRow>
        <PropRow label="Floating Filters">
          <PropSwitch
            checked={state.floatingFiltersEnabled}
            onChange={(v) => setState((prev) => ({ ...prev, floatingFiltersEnabled: v }))}
          />
        </PropRow>
        <PropRow label="Advanced Filter">
          <PropSwitch
            checked={state.advancedFilterEnabled}
            onChange={(v) => setState((prev) => ({ ...prev, advancedFilterEnabled: v }))}
          />
        </PropRow>
      </PropertySection>

      {/* Saved Queries */}
      <div className="gc-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="gc-section-title" style={{ margin: 0, border: 'none', paddingBottom: 0 }}>
            Saved Queries ({state.queries.length})
            {activeCount > 0 && (
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 10,
                  padding: '2px 6px',
                  borderRadius: 8,
                  backgroundColor: 'var(--gc-primary)',
                  color: '#fff',
                  fontWeight: 600,
                }}
              >
                {activeCount} active
              </span>
            )}
          </div>
          <Button variant="default" size="sm" onClick={addQuery}>
            <Icons.Plus size={12} /> Add Query
          </Button>
        </div>

        {state.queries.length === 0 ? (
          <div className="gc-empty">
            No saved queries configured.<br />
            Add a query to create reusable filter presets.
          </div>
        ) : (
          state.queries.map((query) => {
            const isActive = state.activeQueryIds.includes(query.id);
            return (
              <div
                key={query.id}
                className="gc-rule-card"
                style={{ cursor: 'pointer' }}
                onClick={() => setEditingId(editingId === query.id ? null : query.id)}
              >
                <div className="gc-rule-card-header">
                  <Switch
                    checked={query.enabled}
                    onChange={(e) => {
                      e.stopPropagation();
                      updateQuery(query.id, { enabled: !query.enabled });
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ transform: 'scale(0.85)' }}
                  />
                  <div className="gc-rule-card-title">{query.name}</div>
                  {isActive && (
                    <span style={{ fontSize: 10, color: 'var(--gc-primary)', fontWeight: 600 }}>
                      Active
                    </span>
                  )}
                  <Button
                    variant="ghost" size="icon-sm"
                    title={isActive ? 'Deactivate query' : 'Activate query'}
                    onClick={(e) => { e.stopPropagation(); toggleActive(query.id); }}
                  >
                    <Icons.Zap size={12} />
                  </Button>
                  <Button
                    variant="ghost" size="icon-sm"
                    onClick={(e) => { e.stopPropagation(); removeQuery(query.id); }}
                  >
                    <Icons.Trash size={12} />
                  </Button>
                </div>
                <div className="gc-rule-card-body">
                  <span style={{ fontSize: 11, color: 'var(--gc-text-dim)' }}>
                    {query.expressionMode
                      ? (
                          <code style={{ fontFamily: 'var(--gc-font-mono)' }}>
                            {query.expression || '(empty)'}
                          </code>
                        )
                      : `${query.conditions.length} condition${query.conditions.length !== 1 ? 's' : ''} (${query.combinator})`}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Query Editor — remounts on ID change */}
      {editingQuery && (
        <QueryEditor
          key={editingId}
          query={editingQuery}
          onUpdate={(patch) => updateQuery(editingQuery.id, patch)}
          onUpdateCondition={(idx, patch) => updateCondition(editingQuery.id, idx, patch)}
          onAddCondition={() => addCondition(editingQuery.id)}
          onRemoveCondition={(idx) => removeCondition(editingQuery.id, idx)}
        />
      )}
    </div>
  );
}
