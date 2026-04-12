import React, { useCallback } from 'react';
import type { SettingsPanelProps } from '../../types/module';
import type { PerformanceState } from './state';
import { useModuleState } from '../../stores/useModuleState';
import { useGridCustomizerStore } from '../../ui/GridCustomizerContext';
import { NumberField, SwitchField } from '../../ui/FormFields';

export function PerformancePanel({ gridId }: SettingsPanelProps) {
  const store = useGridCustomizerStore();
  const [state, setState] = useModuleState<PerformanceState>(store, 'performance');

  const update = useCallback(
    <K extends keyof PerformanceState>(key: K, value: PerformanceState[K]) => {
      setState((prev) => ({ ...prev, [key]: value }));
    },
    [setState],
  );

  return (
    <div>
      <div className="gc-section">
        <div className="gc-section-title">Virtualisation</div>

        <SwitchField
          label="Suppress Column Virtualisation"
          desc="Render all columns at once instead of only visible ones. Improves print output but reduces performance with many columns."
          checked={state.suppressColumnVirtualisation}
          onChange={(v) => update('suppressColumnVirtualisation', v)}
        />

        <NumberField
          label="Row Buffer"
          desc="Number of extra rows rendered outside the visible area. Higher values reduce flicker during scrolling."
          value={state.rowBuffer}
          onChange={(v) => update('rowBuffer', v)}
          min={0}
          max={100}
        />
      </div>

      <div className="gc-section">
        <div className="gc-section-title">Scrolling</div>

        <SwitchField
          label="Debounce Vertical Scrollbar"
          desc="Adds a small delay before updating rows on scroll. Reduces excessive DOM updates during fast scrolling."
          checked={state.debounceVerticalScrollbar}
          onChange={(v) => update('debounceVerticalScrollbar', v)}
        />
      </div>

      <div className="gc-section">
        <div className="gc-section-title">Rendering</div>

        <SwitchField
          label="Suppress Animation Frame"
          desc="Skip requestAnimationFrame for cell rendering. Reduces visual smoothness but can improve raw throughput."
          checked={state.suppressAnimationFrame}
          onChange={(v) => update('suppressAnimationFrame', v)}
        />

        <SwitchField
          label="Suppress Row Hover Highlight"
          desc="Disable the row hover effect. Eliminates the CSS class toggle on mousemove for large datasets."
          checked={state.suppressRowHoverHighlight}
          onChange={(v) => update('suppressRowHoverHighlight', v)}
        />
      </div>

      <div className="gc-section">
        <div className="gc-section-title">Row Grouping</div>

        <NumberField
          label="Group Default Expanded"
          desc="Number of group levels expanded by default. 0 = collapsed, -1 = expand all."
          value={state.groupDefaultExpanded}
          onChange={(v) => update('groupDefaultExpanded', v)}
          min={-1}
          max={20}
        />
      </div>
    </div>
  );
}
