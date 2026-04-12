import React, { useCallback } from 'react';
import type { SettingsPanelProps } from '../../types/module';
import type { SortFilterState } from './state';
import { useModuleState } from '../../stores/useModuleState';
import { useGridCustomizerStore } from '../../ui/GridCustomizerContext';
import { TextField, SwitchField, SelectField, FieldRow } from '../../ui/FormFields';
import { Select } from '../../ui/shadcn/select';

export function SortFilterPanel({ gridId }: SettingsPanelProps) {
  const store = useGridCustomizerStore();
  const [state, setState] = useModuleState<SortFilterState>(store, 'sort-filter');

  const update = useCallback(
    <K extends keyof SortFilterState>(key: K, value: SortFilterState[K]) => {
      setState((prev) => ({ ...prev, [key]: value }));
    },
    [setState],
  );

  return (
    <div>
      {/* Sort Configuration */}
      <div className="gc-section">
        <div className="gc-section-title">Sort Configuration</div>
        <SelectField
          label="Multi-Sort Key"
          desc="Modifier key to enable multi-column sorting"
          value={state.multiSortKey ?? 'none'}
          onChange={(v) =>
            update(
              'multiSortKey',
              v === 'none' ? undefined : (v as 'ctrl' | 'shift'),
            )
          }
          options={[
            { value: 'none', label: 'None' },
            { value: 'ctrl', label: 'Ctrl' },
            { value: 'shift', label: 'Shift' },
          ]}
        />
        <FieldRow label="Sorting Order" desc="Cycle through sorting directions">
          <Select
            value={JSON.stringify(state.sortingOrder)}
            onChange={(e) => update('sortingOrder', JSON.parse(e.target.value))}
          >
            <option value={JSON.stringify(['asc', 'desc', null])}>Asc / Desc / None</option>
            <option value={JSON.stringify(['asc', 'desc'])}>Asc / Desc</option>
            <option value={JSON.stringify(['desc', 'asc', null])}>Desc / Asc / None</option>
            <option value={JSON.stringify(['desc', 'asc'])}>Desc / Asc</option>
          </Select>
        </FieldRow>
        <SwitchField
          label="Accented Sort"
          desc="Use locale-aware comparison for accented characters"
          checked={state.accentedSort}
          onChange={(v) => update('accentedSort', v)}
        />
        <SwitchField
          label="Suppress Multi-Sort"
          desc="Disable sorting on multiple columns"
          checked={state.suppressMultiSort}
          onChange={(v) => update('suppressMultiSort', v)}
        />
      </div>

      {/* Filter Configuration */}
      <div className="gc-section">
        <div className="gc-section-title">Filter Configuration</div>
        <SwitchField
          label="Floating Filters"
          desc="Show filter inputs below column headers"
          checked={state.floatingFiltersEnabled}
          onChange={(v) => update('floatingFiltersEnabled', v)}
        />
        <TextField
          label="Quick Filter"
          desc="Filter all columns by text"
          value={state.quickFilterText}
          onChange={(v) => update('quickFilterText', v)}
          placeholder="Type to filter..."
        />
        <SwitchField
          label="Cache Quick Filter"
          desc="Cache quick filter results for performance"
          checked={state.cacheQuickFilter}
          onChange={(v) => update('cacheQuickFilter', v)}
        />
        <SwitchField
          label="Advanced Filter"
          desc="Enable the advanced filter builder UI"
          checked={state.advancedFilterEnabled}
          onChange={(v) => update('advancedFilterEnabled', v)}
        />
      </div>
    </div>
  );
}
