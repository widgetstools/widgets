import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { create, type StoreApi, type UseBoundStore } from 'zustand';
import type { GridCustomizerCore } from '../core/GridCustomizerCore';
import type { GridStore, GridCustomizerStore } from '../stores/createGridStore';
import { GridCustomizerProvider } from './GridCustomizerContext';

/**
 * DraftStoreProvider — the key to responsive settings editing.
 *
 * Problem: Panels writing directly to the real Zustand store triggers
 * the transform pipeline → AG-Grid re-renders on every keystroke.
 *
 * Solution: Create a lightweight DRAFT store that mirrors the real store's
 * module states. All panels read/write from the draft (instant, isolated).
 * Only "Apply" flushes the draft → real store → grid update.
 *
 * Zero changes needed in any panel component — they call useGridCustomizerStore()
 * which returns the draft store transparently via the React context.
 */

interface DraftStoreProviderProps {
  realStore: GridStore;
  core: GridCustomizerCore;
  children: React.ReactNode;
  onDirtyChange?: (dirty: boolean) => void;
}

export function DraftStoreProvider({ realStore, core, children, onDirtyChange }: DraftStoreProviderProps) {
  // Snapshot the real store's module states when the sheet opens
  const initialSnapshot = useRef(realStore.getState().modules);

  // Create a local draft store with the same shape
  const draftStore = useMemo(() => {
    const snapshot = { ...realStore.getState().modules };
    initialSnapshot.current = snapshot;

    return create<GridCustomizerStore>((set, get) => ({
      // Copy all state from real store
      modules: snapshot,
      activeProfileId: realStore.getState().activeProfileId,
      defaultProfileId: realStore.getState().defaultProfileId,
      isDirty: false,
      activeSettingsModule: realStore.getState().activeSettingsModule,
      settingsOpen: realStore.getState().settingsOpen,
      undoStack: [],
      redoStack: [],

      // Module state access — operates on draft only
      getModuleState: <T,>(moduleId: string): T => {
        return get().modules[moduleId] as T;
      },

      setModuleState: <T,>(moduleId: string, updater: (prev: T) => T): void => {
        set((state) => {
          const newModules = {
            ...state.modules,
            [moduleId]: updater(state.modules[moduleId] as T),
          };
          return { modules: newModules, isDirty: true };
        });
        onDirtyChange?.(true);
      },

      // These delegate to the real store (they control UI, not grid state)
      setActiveProfile: (id) => realStore.getState().setActiveProfile(id),
      setDefaultProfile: (id) => realStore.getState().setDefaultProfile(id),
      setDirty: (dirty) => set({ isDirty: dirty }),
      setActiveSettingsModule: (id) => {
        set({ activeSettingsModule: id });
        realStore.getState().setActiveSettingsModule(id);
      },
      setSettingsOpen: (open) => realStore.getState().setSettingsOpen(open),
      // Undo/Redo — no-op in draft (draft is transient)
      pushUndoPoint: () => {},
      undo: () => {},
      redo: () => {},
      canUndo: () => false,
      canRedo: () => false,
      clearAll: () => {},

      resetModuleStates: (mods) => {
        const fresh: Record<string, unknown> = {};
        for (const mod of mods) {
          fresh[mod.id] = mod.getInitialState();
        }
        set({ modules: fresh, isDirty: true });
        onDirtyChange?.(true);
      },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // Intentionally created once per mount

  // Sync activeSettingsModule from real store → draft (for external nav changes)
  useEffect(() => {
    const unsub = realStore.subscribe((state) => {
      const draftState = draftStore.getState();
      if (state.activeSettingsModule !== draftState.activeSettingsModule) {
        draftStore.setState({ activeSettingsModule: state.activeSettingsModule });
      }
    });
    return unsub;
  }, [realStore, draftStore]);

  return (
    <DraftContext.Provider value={{ draftStore, realStore, initialSnapshot }}>
      <GridCustomizerProvider store={draftStore as unknown as GridStore} core={core}>
        {children}
      </GridCustomizerProvider>
    </DraftContext.Provider>
  );
}

// ─── Draft Context (for Apply/Reset/Discard) ─────────────────────────────────

interface DraftContextValue {
  draftStore: UseBoundStore<StoreApi<GridCustomizerStore>>;
  realStore: GridStore;
  initialSnapshot: React.MutableRefObject<Record<string, unknown>>;
}

const DraftContext = React.createContext<DraftContextValue | null>(null);

/**
 * Apply draft state to the real store → triggers grid update.
 */
export function useDraftActions() {
  const ctx = React.useContext(DraftContext);
  if (!ctx) throw new Error('useDraftActions must be used within DraftStoreProvider');

  const { draftStore, realStore, initialSnapshot } = ctx;

  const apply = useCallback(() => {
    const draftModules = draftStore.getState().modules;
    // Batch-write all module states to the real store
    for (const [moduleId, moduleState] of Object.entries(draftModules)) {
      realStore.getState().setModuleState(moduleId, () => moduleState);
    }
    realStore.getState().setDirty(true);
    draftStore.setState({ isDirty: false });
    // Update snapshot so "Reset" goes back to this applied state
    initialSnapshot.current = { ...draftModules };
  }, [draftStore, realStore, initialSnapshot]);

  const reset = useCallback(() => {
    draftStore.setState({
      modules: { ...initialSnapshot.current },
      isDirty: false,
    });
  }, [draftStore, initialSnapshot]);

  const discard = useCallback(() => {
    // Restore draft to the snapshot (don't touch real store)
    draftStore.setState({
      modules: { ...initialSnapshot.current },
      isDirty: false,
    });
  }, [draftStore, initialSnapshot]);

  const isDirty = draftStore((s) => s.isDirty);

  return { apply, reset, discard, isDirty };
}
