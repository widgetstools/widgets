import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { SettingsPanelProps } from '../../types/module';
import type { ThemingState, ThemePreset, ThemeCustomParams } from './state';
import { useModuleState } from '../../stores/useModuleState';
import { useGridCustomizerStore } from '../../ui/GridCustomizerContext';
import { NumberField, SelectField, FieldRow } from '../../ui/FormFields';
import { Input } from '../../ui/shadcn/input';

// ── Color Field with local-state text input ──────────────────────────────────

function ThemeColorField({
  label,
  desc,
  value,
  onChange,
}: {
  label: string;
  desc?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [local, setLocal] = useState(value);
  const committed = useRef(value);

  useEffect(() => {
    if (value !== committed.current) {
      setLocal(value);
      committed.current = value;
    }
  }, [value]);

  const commit = useCallback(() => {
    if (local !== committed.current) {
      committed.current = local;
      onChange(local);
    }
  }, [local, onChange]);

  return (
    <FieldRow label={label} desc={desc}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="color"
          className="gc-color-input"
          value={value.startsWith('rgba') ? '#21B8A4' : value}
          onChange={(e) => {
            // Color picker commits instantly
            setLocal(e.target.value);
            committed.current = e.target.value;
            onChange(e.target.value);
          }}
        />
        <Input
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
          style={{ width: 140, fontFamily: 'var(--gc-font-mono)' }}
        />
      </div>
    </FieldRow>
  );
}

export function ThemingPanel({ gridId }: SettingsPanelProps) {
  const store = useGridCustomizerStore();
  const [state, setState] = useModuleState<ThemingState>(store, 'theming');

  const updatePreset = useCallback(
    (preset: ThemePreset) => {
      setState((prev) => ({ ...prev, activeThemePreset: preset }));
    },
    [setState],
  );

  const updateParam = useCallback(
    <K extends keyof ThemeCustomParams>(key: K, value: ThemeCustomParams[K]) => {
      setState((prev) => ({
        ...prev,
        customParams: { ...prev.customParams, [key]: value },
      }));
    },
    [setState],
  );

  return (
    <div>
      <div className="gc-section">
        <div className="gc-section-title">Theme Preset</div>

        <SelectField
          label="Base Theme"
          desc="AG-Grid built-in theme to extend"
          value={state.activeThemePreset}
          onChange={(v) => updatePreset(v as ThemePreset)}
          options={[
            { value: 'quartz', label: 'Quartz' },
            { value: 'alpine', label: 'Alpine' },
            { value: 'balham', label: 'Balham' },
            { value: 'material', label: 'Material' },
          ]}
        />
      </div>

      <div className="gc-section">
        <div className="gc-section-title">Colors</div>

        <ThemeColorField
          label="Accent Color"
          desc="Primary accent used for selections and highlights"
          value={state.customParams.accentColor}
          onChange={(v) => updateParam('accentColor', v)}
        />

        <ThemeColorField
          label="Background Color"
          desc="Main grid background"
          value={state.customParams.backgroundColor}
          onChange={(v) => updateParam('backgroundColor', v)}
        />

        <ThemeColorField
          label="Foreground Color"
          desc="Default text color"
          value={state.customParams.foregroundColor}
          onChange={(v) => updateParam('foregroundColor', v)}
        />

        <ThemeColorField
          label="Border Color"
          desc="Grid and cell border color"
          value={state.customParams.borderColor}
          onChange={(v) => updateParam('borderColor', v)}
        />

        <ThemeColorField
          label="Header Background"
          desc="Column header background color"
          value={state.customParams.headerBackgroundColor}
          onChange={(v) => updateParam('headerBackgroundColor', v)}
        />

        <ThemeColorField
          label="Header Foreground"
          desc="Column header text color"
          value={state.customParams.headerForegroundColor}
          onChange={(v) => updateParam('headerForegroundColor', v)}
        />

        <ThemeColorField
          label="Row Hover Color"
          desc="Background color when hovering over a row"
          value={state.customParams.rowHoverColor}
          onChange={(v) => updateParam('rowHoverColor', v)}
        />

        <ThemeColorField
          label="Selected Row Background"
          desc="Background color for selected rows"
          value={state.customParams.selectedRowBackgroundColor}
          onChange={(v) => updateParam('selectedRowBackgroundColor', v)}
        />
      </div>

      <div className="gc-section">
        <div className="gc-section-title">Typography & Spacing</div>

        <NumberField
          label="Font Size"
          desc="Base font size in pixels"
          value={state.customParams.fontSize}
          onChange={(v) => updateParam('fontSize', v)}
          min={8}
          max={24}
        />

        <NumberField
          label="Header Font Size"
          desc="Column header font size in pixels"
          value={state.customParams.headerFontSize}
          onChange={(v) => updateParam('headerFontSize', v)}
          min={8}
          max={24}
        />

        <NumberField
          label="Spacing"
          desc="Base spacing unit in pixels"
          value={state.customParams.spacing}
          onChange={(v) => updateParam('spacing', v)}
          min={2}
          max={20}
        />
      </div>
    </div>
  );
}
