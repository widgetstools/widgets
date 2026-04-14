import React, { useCallback, useRef, useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllEnterpriseModule, ModuleRegistry } from 'ag-grid-enterprise';
import type { GridReadyEvent, GetRowIdParams } from 'ag-grid-community';
import {
  useGridCustomizer,
  allModules as defaultModules,
  SettingsSheet,
} from '@grid-customizer/core';
import type { MarketsGridProps, SavedFilter } from './types';
import { FormattingToolbar } from './FormattingToolbar';
import { FiltersToolbar } from './FiltersToolbar';
import { doesRowPassFilterModel } from './filterEvaluator';
import { ToolbarSwitcher, type ToolbarSlot } from './ToolbarSwitcher';

// Register AG-Grid Enterprise once
ModuleRegistry.registerModules([AllEnterpriseModule]);

// Stable getRowId — defined outside component for referential stability
function createGetRowId(field: string) {
  return (params: GetRowIdParams) => String(params.data[field]);
}

export function MarketsGrid<TData = any>({
  // Required
  rowData,
  columnDefs: baseColumnDefs,
  theme,
  // Identity
  gridId = 'default',
  rowIdField = 'id',
  // Features
  modules,
  showToolbar = true,
  showSettingsButton = true,
  persistState = true,
  extraToolbars,
  showFiltersToolbar = false,
  // AG-Grid passthrough
  rowHeight = 36,
  headerHeight = 32,
  animateRows = true,
  sideBar,
  statusBar,
  defaultColDef,
  onGridReady: onGridReadyProp,
  // Style
  className,
  style,
}: MarketsGridProps<TData>) {
  const gridRef = useRef<AgGridReact>(null);
  const getRowId = useMemo(() => createGetRowId(rowIdField), [rowIdField]);

  // External filter ref for OR-combining multiple saved filters
  const activeFiltersRef = useRef<SavedFilter[]>([]);

  const {
    columnDefs,
    onGridReady: gcOnGridReady,
    onGridPreDestroyed,
    core,
    store,
    openSettings,
  } = useGridCustomizer({
    gridId,
    baseColumnDefs,
    modules: modules ?? defaultModules,
    rowIdField,
    persistState,
  });

  const handleGridReady = useCallback(
    (event: GridReadyEvent) => {
      gcOnGridReady(event);
      event.api.sizeColumnsToFit();
      onGridReadyProp?.(event);
    },
    [gcOnGridReady, onGridReadyProp],
  );

  return (
    <div
      className={className}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', ...style }}
    >
      {/* Formatting Toolbar (with optional multi-toolbar switcher) */}
      {showToolbar && (() => {
        const formattingBar = <FormattingToolbar core={core} store={store} />;
        const settingsBtn = showSettingsButton ? (
          <button onClick={openSettings} style={{
            height: 36, padding: '0 12px',
            background: 'var(--card, #161a1e)', borderBottom: '1px solid var(--border, #313944)',
            border: 'none', borderLeft: '1px solid var(--border, #313944)',
            color: 'var(--primary, #14b8a6)', fontSize: 9, fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            fontFamily: "var(--fi-sans, 'Geist', sans-serif)",
          }}>
            ⚙ Settings
          </button>
        ) : null;

        // Build toolbar slots: formatting bar is always first
        const slots: ToolbarSlot[] = [
          { id: 'style', label: 'Style', color: 'var(--primary, #14b8a6)', content: formattingBar },
        ];

        // Inject built-in Filters toolbar if enabled
        if (showFiltersToolbar) {
          slots.push({
            id: 'filters',
            label: 'Filters',
            color: 'var(--bn-yellow, #f0b90b)',
            content: (
              <FiltersToolbar
                core={core}
                store={store}
                gridId={gridId}
                activeFiltersRef={activeFiltersRef}
              />
            ),
          });
        }

        // Append any user-provided extra toolbars
        if (extraToolbars) {
          for (const t of extraToolbars) {
            slots.push({
              id: t.id,
              label: t.label,
              color: t.color ?? '',
              content: t.content,
            });
          }
        }

        if (slots.length === 1) {
          // Single toolbar — no switcher needed
          return (
            <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ flex: 1 }}>{formattingBar}</div>
              {settingsBtn}
            </div>
          );
        }

        return (
          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ flex: 1 }}>
              <ToolbarSwitcher toolbars={slots} defaultActiveId="style" />
            </div>
            {settingsBtn}
          </div>
        );
      })()}

      {/* Grid */}
      <div style={{ flex: 1 }}>
        <AgGridReact
          ref={gridRef}
          theme={theme}
          rowData={rowData}
          columnDefs={columnDefs}
          getRowId={getRowId}
          rowHeight={rowHeight}
          headerHeight={headerHeight}
          animateRows={animateRows}
          cellSelection={true}
          isExternalFilterPresent={() => activeFiltersRef.current.length >= 2}
          doesExternalFilterPass={(node: any) => {
            const active = activeFiltersRef.current;
            if (active.length < 2 || !node.data) return true;
            return active.some(f => doesRowPassFilterModel(f.filterModel, node.data));
          }}
          sideBar={sideBar}
          statusBar={statusBar}
          defaultColDef={defaultColDef}
          onGridReady={handleGridReady}
          onGridPreDestroyed={onGridPreDestroyed}
        />
      </div>

      {/* Settings Sheet */}
      <SettingsSheet core={core} store={store} />
    </div>
  );
}
