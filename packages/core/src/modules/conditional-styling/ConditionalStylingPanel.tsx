import React, { useState, useCallback, useRef } from 'react';
import type { SettingsPanelProps } from '../../types/module';
import type { ConditionalStylingState, ConditionalRule, RuleScope } from './state';
import { useModuleState } from '../../stores/useModuleState';
import { useGridCustomizerStore } from '../../ui/GridCustomizerContext';
import { ExpressionEngine } from '../../expression';
import { Icons } from '../../ui/icons';
import { ColumnPickerMulti } from '../../ui/ColumnPicker';
import { PropertySection, PropRow, PropSwitch, PropSelect, PropNumber, PropText, PropColor } from '../../ui/PropertyPanel';
import { Button } from '../../ui/shadcn/button';
import { Input } from '../../ui/shadcn/input';
import { Switch } from '../../ui/shadcn/switch';

const engine = new ExpressionEngine();

function generateId(): string {
  return `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// ── Isolated Rule Editor (local state, commits on blur/Enter) ────────────────

const RuleEditor = React.memo(function RuleEditor({
  rule,
  onUpdate,
}: {
  rule: ConditionalRule;
  onUpdate: (patch: Partial<ConditionalRule>) => void;
}) {
  // PropText and PropNumber handle local state + commit-on-blur internally.
  // Expression still uses raw input for custom validation border styling.
  const [expression, setExpression] = useState(rule.expression);
  const exprRef = useRef(rule.expression);

  const commitExpression = useCallback(() => {
    if (expression !== exprRef.current) { exprRef.current = expression; onUpdate({ expression }); }
  }, [expression, onUpdate]);

  const handleKeyDown = (commit: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commit();
  };

  return (
    <div>
      <PropertySection title="Rule Configuration" defaultOpen>
        <PropRow label="Name">
          <PropText value={rule.name} onChange={(v) => onUpdate({ name: v })} width={200} />
        </PropRow>
        <PropRow label="Scope">
          <PropSelect
            value={rule.scope.type}
            onChange={(v) => {
              const scopeType = v as 'cell' | 'row';
              onUpdate({
                scope: scopeType === 'row' ? { type: 'row' } : { type: 'cell', columns: [] },
              });
            }}
            options={[
              { value: 'cell', label: 'Cell (specific columns)' },
              { value: 'row', label: 'Entire Row' },
            ]}
          />
        </PropRow>
        {rule.scope.type === 'cell' && (
          <PropRow label="Target Columns" vertical>
            <ColumnPickerMulti
              value={(rule.scope as any).columns ?? []}
              onChange={(cols) => onUpdate({ scope: { type: 'cell', columns: cols } })}
              placeholder="Add target columns..."
            />
          </PropRow>
        )}
        <PropRow label="Expression" vertical>
          <Input
            className="font-mono text-[10px]"
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            onBlur={commitExpression}
            onKeyDown={handleKeyDown(commitExpression)}
            placeholder="x >= 1000"
            error={!engine.validate(expression).valid}
            style={{ width: '100%' }}
          />
          <div style={{ fontSize: 10, color: 'var(--gc-text-dim)', marginTop: 4 }}>
            Use <code style={{ fontFamily: 'var(--gc-font-mono)' }}>x</code> for cell value,{' '}
            <code style={{ fontFamily: 'var(--gc-font-mono)' }}>{'data.field'}</code> for row data
          </div>
        </PropRow>
        <PropRow label="Priority">
          <PropNumber value={rule.priority} onChange={(n) => onUpdate({ priority: Math.max(0, Math.min(100, n)) })} min={0} max={100} />
        </PropRow>
      </PropertySection>

      <PropertySection title="Appearance" defaultOpen>
        <PropRow label="Light Theme BG">
          <PropColor
            value={rule.style.light.backgroundColor}
            onChange={(v) => onUpdate({ style: { ...rule.style, light: { ...rule.style.light, backgroundColor: v } } })}
          />
        </PropRow>
        <PropRow label="Dark Theme BG">
          <PropColor
            value={rule.style.dark.backgroundColor}
            onChange={(v) => onUpdate({ style: { ...rule.style, dark: { ...rule.style.dark, backgroundColor: v } } })}
          />
        </PropRow>
        <PropRow label="Text Color">
          <PropColor
            value={rule.style.light.color}
            onChange={(v) => onUpdate({ style: { light: { ...rule.style.light, color: v }, dark: { ...rule.style.dark, color: v } } })}
          />
        </PropRow>
        <PropRow label="Font Weight">
          <PropSelect
            value={rule.style.light.fontWeight ?? 'normal'}
            onChange={(v) => {
              const fw = v === 'normal' ? undefined : v;
              onUpdate({
                style: {
                  light: { ...rule.style.light, fontWeight: fw },
                  dark: { ...rule.style.dark, fontWeight: fw },
                },
              });
            }}
            options={[
              { value: 'normal', label: 'Normal' },
              { value: '500', label: 'Medium' },
              { value: '600', label: 'Semibold' },
              { value: '700', label: 'Bold' },
            ]}
          />
        </PropRow>
      </PropertySection>
    </div>
  );
});

export function ConditionalStylingPanel({ gridId }: SettingsPanelProps) {
  const store = useGridCustomizerStore();
  const [state, setState] = useModuleState<ConditionalStylingState>(store, 'conditional-styling');
  const [editingId, setEditingId] = useState<string | null>(null);

  const addRule = useCallback(() => {
    const newRule: ConditionalRule = {
      id: generateId(),
      name: 'New Rule',
      enabled: true,
      priority: state.rules.length,
      scope: { type: 'cell', columns: [] },
      expression: 'x > 0',
      style: {
        light: { backgroundColor: 'rgba(16,185,129,0.12)' },
        dark: { backgroundColor: 'rgba(33,184,164,0.15)' },
      },
    };
    setState((prev) => ({ ...prev, rules: [...prev.rules, newRule] }));
    setEditingId(newRule.id);
  }, [state.rules.length, setState]);

  const updateRule = useCallback(
    (ruleId: string, patch: Partial<ConditionalRule>) => {
      setState((prev) => ({
        ...prev,
        rules: prev.rules.map((r) => (r.id === ruleId ? { ...r, ...patch } : r)),
      }));
    },
    [setState],
  );

  const removeRule = useCallback(
    (ruleId: string) => {
      setState((prev) => ({
        ...prev,
        rules: prev.rules.filter((r) => r.id !== ruleId),
      }));
      if (editingId === ruleId) setEditingId(null);
    },
    [setState, editingId],
  );

  const editingRule = editingId ? state.rules.find((r) => r.id === editingId) : null;

  return (
    <div>
      <div className="gc-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="gc-section-title" style={{ margin: 0, border: 'none', paddingBottom: 0 }}>
            Styling Rules ({state.rules.length})
          </div>
          <Button variant="default" size="sm" onClick={addRule}>
            <Icons.Plus size={12} /> Add Rule
          </Button>
        </div>

        {state.rules.length === 0 ? (
          <div className="gc-empty">
            No conditional styling rules configured.<br />
            Add a rule to apply dynamic styles based on cell values.
          </div>
        ) : (
          state.rules.map((rule) => {
            const validation = engine.validate(rule.expression);
            return (
              <div
                key={rule.id}
                className="gc-rule-card"
                style={{ cursor: 'pointer' }}
                onClick={() => setEditingId(editingId === rule.id ? null : rule.id)}
              >
                <div className="gc-rule-card-header">
                  <Switch
                    checked={rule.enabled}
                    onChange={(e) => {
                      e.stopPropagation();
                      updateRule(rule.id, { enabled: !rule.enabled });
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ transform: 'scale(0.85)' }}
                  />
                  <div className="gc-rule-card-title">{rule.name}</div>
                  <div
                    className="gc-color-swatch"
                    style={{ background: rule.style.dark.backgroundColor ?? rule.style.light.backgroundColor ?? '#666' }}
                  />
                  {!validation.valid && (
                    <span style={{ fontSize: 10, color: 'var(--gc-danger)' }}>Error</span>
                  )}
                  <Button
                    variant="ghost" size="icon-sm"
                    onClick={(e) => { e.stopPropagation(); removeRule(rule.id); }}
                  >
                    <Icons.Trash size={12} />
                  </Button>
                </div>
                <div className="gc-rule-card-body">
                  <code style={{ fontFamily: 'var(--gc-font-mono)', fontSize: 11 }}>
                    {rule.expression}
                  </code>
                  <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--gc-text-dim)' }}>
                    {rule.scope.type === 'row' ? 'Row' : `${(rule.scope as any).columns?.length ?? 0} columns`}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Inline editor for selected rule — remounts on ID change */}
      {editingRule && (
        <RuleEditor
          key={editingId}
          rule={editingRule}
          onUpdate={(patch) => updateRule(editingRule.id, patch)}
        />
      )}
    </div>
  );
}
