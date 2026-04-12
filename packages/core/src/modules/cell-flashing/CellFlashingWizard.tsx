import React, { useState, useCallback } from 'react';
import type { SettingsPanelProps } from '../../types/module';
import type { CellFlashingState, FlashRule } from './state';
import { useModuleState } from '../../stores/useModuleState';
import { useGridCustomizerStore } from '../../ui/GridCustomizerContext';
import { Icons } from '../../ui/icons';
import { ColumnPickerMulti } from '../../ui/ColumnPicker';
import { PropertySection, PropRow, PropSwitch, PropSelect, PropNumber, PropText, PropColor } from '../../ui/PropertyPanel';
import { Button } from '../../ui/shadcn/button';
import { Switch } from '../../ui/shadcn/switch';

function generateId(): string {
  return `fl${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function defaultFlashRule(): FlashRule {
  return {
    id: generateId(),
    name: 'New Flash Rule',
    enabled: true,
    columns: [],
    condition: undefined,
    flashDuration: 500,
    fadeDuration: 1000,
    upColor: { light: 'rgba(22,163,74,0.25)', dark: 'rgba(34,197,94,0.3)' },
    downColor: { light: 'rgba(220,38,38,0.25)', dark: 'rgba(248,113,113,0.3)' },
    neutralColor: { light: 'rgba(59,130,246,0.2)', dark: 'rgba(96,165,250,0.25)' },
    scope: 'cell',
  };
}

// ── Isolated Rule Editor (local state, commits on blur/Enter) ────────────────

const FlashRuleEditor = React.memo(function FlashRuleEditor({
  rule,
  onUpdate,
}: {
  rule: FlashRule;
  onUpdate: (patch: Partial<FlashRule>) => void;
}) {
  // PropText handles local state + commit-on-blur for name and condition.

  return (
    <div>
      <PropertySection title="Flash Settings" defaultOpen>
        <PropRow label="Name">
          <PropText value={rule.name} onChange={(v) => onUpdate({ name: v })} width={200} />
        </PropRow>
        <PropRow label="Scope">
          <PropSelect
            value={rule.scope}
            onChange={(v) => onUpdate({ scope: v as 'cell' | 'row' })}
            options={[
              { value: 'cell', label: 'Cell (flash changed cell only)' },
              { value: 'row', label: 'Row (flash entire row)' },
            ]}
          />
        </PropRow>
        <PropRow label="Target Columns" vertical hint="empty = all">
          <ColumnPickerMulti
            value={rule.columns}
            onChange={(cols) => onUpdate({ columns: cols })}
            placeholder="Add columns to flash..."
          />
        </PropRow>
        <PropRow label="Condition" vertical hint="optional">
          <PropText
            value={rule.condition ?? ''}
            onChange={(v) => onUpdate({ condition: v || undefined })}
            placeholder="value > 1000"
            mono
          />
          <div style={{ fontSize: 10, color: 'var(--gc-text-dim)', marginTop: 4 }}>
            Use <code style={{ fontFamily: 'var(--gc-font-mono)' }}>value</code> for new value,{' '}
            <code style={{ fontFamily: 'var(--gc-font-mono)' }}>data.field</code> for row data.
            Leave blank to flash on every change.
          </div>
        </PropRow>
      </PropertySection>

      <PropertySection title="Timing" defaultOpen>
        <PropRow label="Flash Duration (ms)">
          <input
            type="range" min={100} max={3000} step={100}
            value={rule.flashDuration}
            onChange={(e) => onUpdate({ flashDuration: Number(e.target.value) })}
          />
          <span style={{ fontSize: 11, minWidth: 40, textAlign: 'right' }}>{rule.flashDuration}</span>
        </PropRow>
        <PropRow label="Fade Duration (ms)">
          <input
            type="range" min={100} max={5000} step={100}
            value={rule.fadeDuration}
            onChange={(e) => onUpdate({ fadeDuration: Number(e.target.value) })}
          />
          <span style={{ fontSize: 11, minWidth: 40, textAlign: 'right' }}>{rule.fadeDuration}</span>
        </PropRow>
      </PropertySection>

      <PropertySection title="Colors" defaultOpen>
        <PropRow label="Up (Light)">
          <PropColor
            value={rule.upColor.light.startsWith('rgba') ? '#16a34a' : rule.upColor.light}
            onChange={(v) => onUpdate({ upColor: { ...rule.upColor, light: v } })}
          />
        </PropRow>
        <PropRow label="Up (Dark)">
          <PropColor
            value={rule.upColor.dark.startsWith('rgba') ? '#22c55e' : rule.upColor.dark}
            onChange={(v) => onUpdate({ upColor: { ...rule.upColor, dark: v } })}
          />
        </PropRow>
        <PropRow label="Down (Light)">
          <PropColor
            value={rule.downColor.light.startsWith('rgba') ? '#dc2626' : rule.downColor.light}
            onChange={(v) => onUpdate({ downColor: { ...rule.downColor, light: v } })}
          />
        </PropRow>
        <PropRow label="Down (Dark)">
          <PropColor
            value={rule.downColor.dark.startsWith('rgba') ? '#f87171' : rule.downColor.dark}
            onChange={(v) => onUpdate({ downColor: { ...rule.downColor, dark: v } })}
          />
        </PropRow>
        <PropRow label="Neutral (Light)">
          <PropColor
            value={rule.neutralColor.light.startsWith('rgba') ? '#3b82f6' : rule.neutralColor.light}
            onChange={(v) => onUpdate({ neutralColor: { ...rule.neutralColor, light: v } })}
          />
        </PropRow>
        <PropRow label="Neutral (Dark)">
          <PropColor
            value={rule.neutralColor.dark.startsWith('rgba') ? '#60a5fa' : rule.neutralColor.dark}
            onChange={(v) => onUpdate({ neutralColor: { ...rule.neutralColor, dark: v } })}
          />
        </PropRow>
      </PropertySection>
    </div>
  );
});

export function CellFlashingWizard({ gridId }: SettingsPanelProps) {
  const store = useGridCustomizerStore();
  const [state, setState] = useModuleState<CellFlashingState>(store, 'cell-flashing');
  const [editingId, setEditingId] = useState<string | null>(null);

  const addRule = useCallback(() => {
    const newRule = defaultFlashRule();
    setState((prev) => ({ ...prev, rules: [...prev.rules, newRule] }));
    setEditingId(newRule.id);
  }, [setState]);

  const updateRule = useCallback(
    (ruleId: string, patch: Partial<FlashRule>) => {
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
      {/* ── Global Defaults ───────────────────────────────────────────── */}
      <div className="gc-section">
        <div className="gc-section-title">Global Defaults</div>

        <div className="gc-field">
          <div className="gc-field-label">Enable Change Detection</div>
          <Switch
            checked={state.enableChangeDetection}
            onChange={() =>
              setState((prev) => ({ ...prev, enableChangeDetection: !prev.enableChangeDetection }))
            }
          />
        </div>

        {/* Range sliders are fine with direct store writes */}
        <div className="gc-field">
          <div className="gc-field-label">Flash Duration (ms)</div>
          <input
            type="range"
            min={100}
            max={3000}
            step={100}
            value={state.globalFlashDuration}
            onChange={(e) =>
              setState((prev) => ({ ...prev, globalFlashDuration: Number(e.target.value) }))
            }
          />
          <span style={{ fontSize: 11, minWidth: 40, textAlign: 'right' }}>
            {state.globalFlashDuration}
          </span>
        </div>

        <div className="gc-field">
          <div className="gc-field-label">Fade Duration (ms)</div>
          <input
            type="range"
            min={100}
            max={5000}
            step={100}
            value={state.globalFadeDuration}
            onChange={(e) =>
              setState((prev) => ({ ...prev, globalFadeDuration: Number(e.target.value) }))
            }
          />
          <span style={{ fontSize: 11, minWidth: 40, textAlign: 'right' }}>
            {state.globalFadeDuration}
          </span>
        </div>
      </div>

      {/* ── Flash Rules List ──────────────────────────────────────────── */}
      <div className="gc-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="gc-section-title" style={{ margin: 0, border: 'none', paddingBottom: 0 }}>
            Flash Rules ({state.rules.length})
          </div>
          <Button variant="default" size="sm" onClick={addRule}>
            <Icons.Plus size={12} /> Add Rule
          </Button>
        </div>

        {state.rules.length === 0 ? (
          <div className="gc-empty">
            No flash rules configured.<br />
            Add a rule to flash cells or rows when values change.
          </div>
        ) : (
          state.rules.map((rule) => (
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
                <div style={{ display: 'flex', gap: 3 }}>
                  <div className="gc-color-swatch" style={{ background: rule.upColor.light, width: 14, height: 14 }} />
                  <div className="gc-color-swatch" style={{ background: rule.downColor.light, width: 14, height: 14 }} />
                </div>
                <span style={{ fontSize: 10, color: 'var(--gc-text-dim)' }}>
                  {rule.scope === 'row' ? 'Row' : 'Cell'}
                </span>
                <Button
                  variant="ghost" size="icon-sm"
                  onClick={(e) => { e.stopPropagation(); removeRule(rule.id); }}
                >
                  <Icons.Trash size={12} />
                </Button>
              </div>
              <div className="gc-rule-card-body">
                <span style={{ fontSize: 11, color: 'var(--gc-text-dim)' }}>
                  {rule.columns.length === 0 ? 'All columns' : rule.columns.join(', ')}
                </span>
                {rule.condition && (
                  <code style={{ fontFamily: 'var(--gc-font-mono)', fontSize: 11, marginLeft: 8 }}>
                    {rule.condition}
                  </code>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Rule Editor — remounts on ID change ──────────────────────── */}
      {editingRule && (
        <FlashRuleEditor
          key={editingId}
          rule={editingRule}
          onUpdate={(patch) => updateRule(editingRule.id, patch)}
        />
      )}
    </div>
  );
}
