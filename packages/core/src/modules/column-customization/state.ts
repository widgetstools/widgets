import type { ColumnAssignment, ColumnOverride } from '../../types/common';

export interface ColumnCustomizationState {
  assignments: Record<string, ColumnAssignment>;
}

export const INITIAL_COLUMN_CUSTOMIZATION: ColumnCustomizationState = {
  assignments: {},
};

// ─── Migration: old overrides → assignments ──────────────────────────────────

export interface LegacyColumnCustomizationState {
  overrides: Record<string, ColumnOverride>;
}

export function migrateFromLegacy(legacy: LegacyColumnCustomizationState): ColumnCustomizationState {
  const assignments: Record<string, ColumnAssignment> = {};
  for (const [colId, override] of Object.entries(legacy.overrides)) {
    assignments[colId] = {
      colId,
      headerName: override.headerName,
      headerTooltip: override.headerTooltip,
      initialWidth: override.initialWidth,
      initialHide: override.initialHide,
      initialPinned: override.initialPinned,
      headerStyleOverrides: override.headerStyle,
      cellStyleOverrides: override.cellStyle,
      cellEditorName: override.cellEditorName,
      cellEditorParams: override.cellEditorParams,
      cellRendererName: override.cellRendererName,
      sortable: override.sortable,
      filterable: override.filterable,
      resizable: override.resizable,
    };
  }
  return { assignments };
}
