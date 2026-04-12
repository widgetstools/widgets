import React, { useCallback, useRef, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllEnterpriseModule, ModuleRegistry } from 'ag-grid-enterprise';
import type { GridReadyEvent, GetRowIdParams } from 'ag-grid-community';
import {
  useGridCustomizer,
  allModules as defaultModules,
  SettingsSheet,
} from '@grid-customizer/core';
import type { MarketsGridProps } from './types';
import { FormattingToolbar } from './FormattingToolbar';

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
      {/* Formatting Toolbar */}
      {showToolbar && (
        <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <FormattingToolbar core={core} store={store} />
          </div>
          {showSettingsButton && (
            <button onClick={openSettings} style={{
              height: 36, padding: '0 12px',
              background: 'var(--card, #1e2329)', borderBottom: '1px solid var(--border, #313944)',
              border: 'none', borderLeft: '1px solid var(--border, #313944)',
              color: 'var(--primary, #f0b90b)', fontSize: 9, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
              fontFamily: "'Geist', sans-serif",
            }}>
              ⚙ Settings
            </button>
          )}
        </div>
      )}

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
