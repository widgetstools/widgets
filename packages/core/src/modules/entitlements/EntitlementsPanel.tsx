import React, { useState, useCallback } from 'react';
import type { SettingsPanelProps } from '../../types/module';
import type { EntitlementsState, EntitlementRule } from './state';
import { useModuleState } from '../../stores/useModuleState';
import { useGridCustomizerStore } from '../../ui/GridCustomizerContext';
import { Icons } from '../../ui/icons';
import { ColumnPickerSingle } from '../../ui/ColumnPicker';
import { PropertySection, PropRow, PropSwitch, PropSelect, PropNumber, PropText } from '../../ui/PropertyPanel';
import { Button } from '../../ui/shadcn/button';
import { Switch } from '../../ui/shadcn/switch';

function generateId(): string {
  return `ent${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// ── Isolated Rule Editor (local state, commits on blur/Enter) ────────────────

const EntitlementEditor = React.memo(function EntitlementEditor({
  rule,
  onUpdate,
}: {
  rule: EntitlementRule;
  onUpdate: (patch: Partial<EntitlementRule>) => void;
}) {
  // PropText and PropNumber handle local state + commit-on-blur internally.

  return (
    <div>
      <PropertySection title="Rule Settings" defaultOpen>
        <PropRow label="Name">
          <PropText value={rule.name} onChange={(v) => onUpdate({ name: v })} />
        </PropRow>
        <PropRow label="Target Column" vertical hint={rule.columnId ? rule.columnId : undefined}>
          <ColumnPickerSingle
            placeholder="Search columns..."
            onSelect={(col) => onUpdate({ columnId: col.colId })}
          />
        </PropRow>
        <PropRow label="Type">
          <PropSelect
            value={rule.type}
            onChange={(v) => onUpdate({ type: v as EntitlementRule['type'] })}
            options={[
              { value: 'row-value', label: 'Row Value Expression' },
              { value: 'role-based', label: 'Role Based' },
              { value: 'rest', label: 'REST Endpoint' },
            ]}
          />
        </PropRow>
        <PropRow label="Fallback">
          <PropSelect
            value={rule.fallback}
            onChange={(v) => onUpdate({ fallback: v as 'allow' | 'deny' })}
            options={[
              { value: 'deny', label: 'Deny (read-only)' },
              { value: 'allow', label: 'Allow (editable)' },
            ]}
          />
        </PropRow>
      </PropertySection>

      <PropertySection title="Configuration" defaultOpen>
        {rule.type === 'row-value' && (
          <PropRow label="Expression" vertical>
            <PropText
              value={rule.expression}
              onChange={(v) => onUpdate({ expression: v })}
              placeholder="data.status !== 'locked'"
              mono
            />
            <div style={{ fontSize: 10, color: 'var(--gc-text-dim)', marginTop: 4 }}>
              JavaScript expression. Access row data via <code style={{ fontFamily: 'var(--gc-font-mono)' }}>data</code>.
            </div>
          </PropRow>
        )}

        {rule.type === 'role-based' && (
          <PropRow label="Allowed Roles" vertical hint="comma-separated">
            <PropText
              value={rule.roles.join(', ')}
              onChange={(v) => onUpdate({ roles: v.split(',').map((s) => s.trim()).filter(Boolean) })}
              placeholder="admin, editor, trader"
            />
          </PropRow>
        )}

        {rule.type === 'rest' && (
          <>
            <PropRow label="Endpoint URL" vertical>
              <PropText
                value={rule.endpoint}
                onChange={(v) => onUpdate({ endpoint: v })}
                placeholder="https://api.example.com/entitlements"
                mono
              />
            </PropRow>
            <PropRow label="Cache TTL (seconds)">
              <PropNumber
                value={rule.cacheTtl}
                onChange={(n) => onUpdate({ cacheTtl: Math.max(0, Math.min(86400, n)) })}
                min={0}
                max={86400}
              />
            </PropRow>
          </>
        )}
      </PropertySection>
    </div>
  );
});

export function EntitlementsPanel({ gridId }: SettingsPanelProps) {
  const store = useGridCustomizerStore();
  const [state, setState] = useModuleState<EntitlementsState>(store, 'entitlements');
  const [editingId, setEditingId] = useState<string | null>(null);

  const addRule = useCallback(() => {
    const newRule: EntitlementRule = {
      id: generateId(),
      name: 'New Entitlement',
      enabled: true,
      columnId: '',
      type: 'row-value',
      expression: 'true',
      roles: [],
      endpoint: '',
      cacheTtl: 60,
      fallback: 'deny',
    };
    setState((prev) => ({ ...prev, rules: [...prev.rules, newRule] }));
    setEditingId(newRule.id);
  }, [setState]);

  const updateRule = useCallback(
    (ruleId: string, patch: Partial<EntitlementRule>) => {
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
            Entitlement Rules ({state.rules.length})
          </div>
          <Button variant="default" size="sm" onClick={addRule}>
            <Icons.Plus size={12} /> Add Rule
          </Button>
        </div>

        {state.rules.length === 0 ? (
          <div className="gc-empty">
            No entitlement rules configured.<br />
            Add a rule to control cell editability based on data, roles, or REST endpoints.
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
                <span style={{ fontSize: 10, color: 'var(--gc-text-dim)', marginLeft: 'auto' }}>
                  {rule.type}
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
                  Column: <code style={{ fontFamily: 'var(--gc-font-mono)' }}>{rule.columnId || '(none)'}</code>
                  {' | Fallback: '}{rule.fallback}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Rule Editor — remounts on ID change */}
      {editingRule && (
        <EntitlementEditor
          key={editingId}
          rule={editingRule}
          onUpdate={(patch) => updateRule(editingRule.id, patch)}
        />
      )}
    </div>
  );
}
