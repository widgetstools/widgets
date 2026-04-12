import type { ColDef, ColGroupDef } from 'ag-grid-community';
import type { GridCustomizerModule } from '../../types/module';
import type { GridContext } from '../../types/common';
import { INITIAL_COLUMN_GROUPS, type ColumnGroupsState } from './state';
import { ColumnGroupsWizard } from './ColumnGroupsWizard';

function flattenDefs(defs: (ColDef | ColGroupDef)[]): ColDef[] {
  const flat: ColDef[] = [];
  for (const def of defs) {
    if ('children' in def && def.children) {
      flat.push(...flattenDefs(def.children));
    } else {
      flat.push(def as ColDef);
    }
  }
  return flat;
}

export const columnGroupsModule: GridCustomizerModule<ColumnGroupsState> = {
  id: 'column-groups',
  name: 'Column Groups',
  icon: 'ColumnGroups',
  priority: 15,

  getInitialState: () => ({ ...INITIAL_COLUMN_GROUPS }),

  transformColumnDefs(
    defs: (ColDef | ColGroupDef)[],
    state: ColumnGroupsState,
    _ctx: GridContext,
  ): (ColDef | ColGroupDef)[] {
    if (state.groups.length === 0) return defs;

    // Flatten all existing defs to a map by colId/field
    const flatDefs = flattenDefs(defs);
    const defMap = new Map<string, ColDef>();
    for (const def of flatDefs) {
      const id = def.colId ?? def.field;
      if (id) defMap.set(id, def);
    }

    // Track which columns are assigned to groups
    const assignedCols = new Set<string>();
    for (const group of state.groups) {
      for (const colId of group.children) {
        assignedCols.add(colId);
      }
    }

    // Build group defs
    const result: (ColDef | ColGroupDef)[] = [];

    // First add groups in order
    for (const group of state.groups) {
      const children: ColDef[] = [];
      for (const colId of group.children) {
        const colDef = defMap.get(colId);
        if (colDef) children.push(colDef);
      }
      if (children.length > 0) {
        result.push({
          groupId: group.groupId,
          headerName: group.headerName,
          openByDefault: group.openByDefault,
          marryChildren: group.marryChildren,
          children,
        });
      }
    }

    // Then add ungrouped columns
    for (const def of flatDefs) {
      const id = def.colId ?? def.field;
      if (id && !assignedCols.has(id)) {
        result.push(def);
      }
    }

    return result;
  },

  serialize: (state) => state,
  deserialize: (data) => ({
    ...INITIAL_COLUMN_GROUPS,
    ...(data as Partial<ColumnGroupsState>),
  }),

  SettingsPanel: ColumnGroupsWizard,
};

export type { ColumnGroupConfig, ColumnGroupsState } from './state';
