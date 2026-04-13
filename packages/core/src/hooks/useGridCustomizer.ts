import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { ColDef, ColGroupDef, GridOptions, GridReadyEvent } from 'ag-grid-community';
import type { AnyModule } from '../types/module';
import { GridCustomizerCore } from '../core/GridCustomizerCore';
import { createGridStore, destroyGridStore, type GridStore, type GridCustomizerStore } from '../stores/createGridStore';

const LS_PREFIX = 'gc-state:';

export interface UseGridCustomizerOptions {
  gridId: string;
  baseColumnDefs: (ColDef | ColGroupDef)[];
  baseGridOptions?: Partial<GridOptions>;
  modules: AnyModule[];
  rowIdField?: string;
  /** Auto-persist module state to localStorage on every apply. Default: true */
  persistState?: boolean;
}

export interface UseGridCustomizerReturn {
  columnDefs: (ColDef | ColGroupDef)[];
  gridOptions: Partial<GridOptions>;
  onGridReady: (event: GridReadyEvent) => void;
  onGridPreDestroyed: () => void;
  core: GridCustomizerCore;
  store: GridStore;
  openSettings: () => void;
  closeSettings: () => void;
}

export function useGridCustomizer(options: UseGridCustomizerOptions): UseGridCustomizerReturn {
  const { gridId, baseColumnDefs, baseGridOptions = {}, modules, rowIdField, persistState = true } = options;

  const store = useMemo(() => createGridStore(gridId, modules), [gridId, modules]);

  const coreRef = useRef<GridCustomizerCore | null>(null);
  if (!coreRef.current) {
    coreRef.current = new GridCustomizerCore({
      gridId,
      modules,
      getModuleState: store.getState().getModuleState,
      setModuleState: store.getState().setModuleState,
      rowIdField,
    });

    // ── Auto-load persisted state from localStorage on init ──
    if (persistState) {
      try {
        const saved = localStorage.getItem(LS_PREFIX + gridId);
        if (saved) {
          const parsed = JSON.parse(saved) as Record<string, unknown>;
          coreRef.current.deserializeAll(parsed);
        }
      } catch {
        // Ignore corrupt localStorage
      }
    }
  }
  const core = coreRef.current;

  // Keep core's store bindings in sync (React strict mode may recreate the store)
  core.updateStoreBindings(store.getState().getModuleState, store.getState().setModuleState);

  // Subscribe to module state changes to trigger re-render
  const moduleStates = store((s: GridCustomizerStore) => s.modules);

  const columnDefs = useMemo(
    () => core.transformColumnDefs(baseColumnDefs),
    [core, baseColumnDefs, moduleStates],
  );

  const gridOptions = useMemo(
    () => core.transformGridOptions(baseGridOptions),
    [core, baseGridOptions, moduleStates],
  );

  const onGridReady = useCallback(
    (event: GridReadyEvent) => {
      core.onGridReady(event.api);
    },
    [core],
  );

  const onGridPreDestroyed = useCallback(() => {
    core.onGridDestroy();
  }, [core]);

  useEffect(() => {
    return () => {
      core.onGridDestroy();
      destroyGridStore(gridId);
    };
  }, [core, gridId]);

  // Auto-persist removed — styles only save when user explicitly clicks the Save button.
  // The Save button in FormattingToolbar calls core.serializeAll() + localStorage.setItem().

  const openSettings = useCallback(() => {
    store.getState().setSettingsOpen(true);
  }, [store]);

  const closeSettings = useCallback(() => {
    store.getState().setSettingsOpen(false);
  }, [store]);

  return {
    columnDefs,
    gridOptions,
    onGridReady,
    onGridPreDestroyed,
    core,
    store,
    openSettings,
    closeSettings,
  };
}
