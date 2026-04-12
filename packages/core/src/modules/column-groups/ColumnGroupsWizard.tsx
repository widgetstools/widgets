import React, { useState, useCallback } from 'react';
import type { SettingsPanelProps } from '../../types/module';
import type { ColumnGroupsState, ColumnGroupConfig } from './state';
import { useModuleState } from '../../stores/useModuleState';
import { useGridCustomizerStore } from '../../ui/GridCustomizerContext';
import { Icons } from '../../ui/icons';
import { ColumnPickerMulti } from '../../ui/ColumnPicker';
import { PropertySection, PropRow, PropSwitch, PropText } from '../../ui/PropertyPanel';
import { Button } from '../../ui/shadcn/button';

function generateId(): string {
  return `grp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// ─── Isolated Group Editor (local state, commit on blur) ─────────────────────

const GroupEditor = React.memo(function GroupEditor({
  group,
  onUpdate,
}: {
  group: ColumnGroupConfig;
  onUpdate: (groupId: string, patch: Partial<ColumnGroupConfig>) => void;
}) {
  // PropText handles local state + commit-on-blur internally

  return (
    <div>
      <PropertySection title="Group Settings" defaultOpen>
        <PropRow label="Header Name">
          <PropText value={group.headerName} onChange={(v) => onUpdate(group.groupId, { headerName: v })} width={200} />
        </PropRow>
        <PropRow label="Columns" vertical>
          <ColumnPickerMulti
            value={group.children}
            onChange={(cols) => onUpdate(group.groupId, { children: cols })}
            placeholder="Add columns to group..."
          />
        </PropRow>
      </PropertySection>

      <PropertySection title="Behavior" defaultOpen>
        <PropRow label="Open by Default">
          <PropSwitch checked={group.openByDefault} onChange={(v) => onUpdate(group.groupId, { openByDefault: v })} />
        </PropRow>
        <PropRow label="Marry Children" hint="Lock columns together in the group">
          <PropSwitch checked={group.marryChildren} onChange={(v) => onUpdate(group.groupId, { marryChildren: v })} />
        </PropRow>
      </PropertySection>
    </div>
  );
});

// ─── Main Panel ──────────────────────────────────────────────────────────────

export function ColumnGroupsWizard({ gridId }: SettingsPanelProps) {
  const store = useGridCustomizerStore();
  const [state, setState] = useModuleState<ColumnGroupsState>(store, 'column-groups');
  const [editingId, setEditingId] = useState<string | null>(null);

  const addGroup = useCallback(() => {
    const group: ColumnGroupConfig = {
      groupId: generateId(),
      headerName: 'New Group',
      children: [],
      openByDefault: true,
      marryChildren: false,
    };
    setState((prev) => ({ ...prev, groups: [...prev.groups, group] }));
    setEditingId(group.groupId);
  }, [setState]);

  const updateGroup = useCallback(
    (groupId: string, patch: Partial<ColumnGroupConfig>) => {
      setState((prev) => ({
        ...prev,
        groups: prev.groups.map((g) => (g.groupId === groupId ? { ...g, ...patch } : g)),
      }));
    },
    [setState],
  );

  const removeGroup = useCallback(
    (groupId: string) => {
      setState((prev) => ({ ...prev, groups: prev.groups.filter((g) => g.groupId !== groupId) }));
      if (editingId === groupId) setEditingId(null);
    },
    [setState, editingId],
  );

  const moveGroup = useCallback(
    (groupId: string, direction: -1 | 1) => {
      setState((prev) => {
        const idx = prev.groups.findIndex((g) => g.groupId === groupId);
        if (idx < 0) return prev;
        const newIdx = idx + direction;
        if (newIdx < 0 || newIdx >= prev.groups.length) return prev;
        const groups = [...prev.groups];
        [groups[idx], groups[newIdx]] = [groups[newIdx], groups[idx]];
        return { ...prev, groups };
      });
    },
    [setState],
  );

  const editingGroup = editingId ? state.groups.find((g) => g.groupId === editingId) : null;

  return (
    <div>
      <div className="gc-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="gc-section-title" style={{ margin: 0, border: 'none', paddingBottom: 0 }}>
            Column Groups ({state.groups.length})
          </div>
          <Button variant="default" size="sm" onClick={addGroup}>
            <Icons.Plus size={12} /> Add Group
          </Button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--gc-text-dim)', marginBottom: 12 }}>
          Organize columns into header groups. Use the column picker to assign columns.
        </p>

        {state.groups.length === 0 ? (
          <div className="gc-empty">No column groups configured</div>
        ) : (
          state.groups.map((group, idx) => (
            <div
              key={group.groupId}
              className="gc-rule-card"
              style={{ cursor: 'pointer' }}
              onClick={() => setEditingId(editingId === group.groupId ? null : group.groupId)}
            >
              <div className="gc-rule-card-header">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Button
                    variant="ghost" size="icon-sm"
                    onClick={(e) => { e.stopPropagation(); moveGroup(group.groupId, -1); }}
                    disabled={idx === 0}
                    style={{ opacity: idx === 0 ? 0.3 : 1, height: 14, width: 20 }}
                  >
                    &#9650;
                  </Button>
                  <Button
                    variant="ghost" size="icon-sm"
                    onClick={(e) => { e.stopPropagation(); moveGroup(group.groupId, 1); }}
                    disabled={idx === state.groups.length - 1}
                    style={{ opacity: idx === state.groups.length - 1 ? 0.3 : 1, height: 14, width: 20 }}
                  >
                    &#9660;
                  </Button>
                </div>
                <div className="gc-rule-card-title">{group.headerName}</div>
                <span style={{ fontSize: 10, color: 'var(--gc-text-dim)' }}>
                  {group.children.length} col{group.children.length !== 1 ? 's' : ''}
                </span>
                <Button
                  variant="ghost" size="icon-sm"
                  onClick={(e) => { e.stopPropagation(); removeGroup(group.groupId); }}
                >
                  <Icons.Trash size={12} />
                </Button>
              </div>
              {group.children.length > 0 && (
                <div className="gc-rule-card-body">
                  <code style={{ fontFamily: 'var(--gc-font-mono)', fontSize: 10 }}>
                    {group.children.join(', ')}
                  </code>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {editingGroup && (
        <GroupEditor
          key={editingGroup.groupId}
          group={editingGroup}
          onUpdate={updateGroup}
        />
      )}
    </div>
  );
}
