import { create, type StoreApi, type UseBoundStore } from 'zustand';
import type { AnyModule } from '../types/module';

// ─── Undo/Redo History Entry ─────────────────────────────────────────────────

interface HistoryEntry {
  modules: Record<string, unknown>;
  label: string;
  timestamp: number;
}

const MAX_UNDO_HISTORY = 50;

// ─── Store Types ─────────────────────────────────────────────────────────────

export interface GridCustomizerStoreState {
  modules: Record<string, unknown>;
  activeProfileId: string | null;
  defaultProfileId: string | null;
  isDirty: boolean;
  activeSettingsModule: string | null;
  settingsOpen: boolean;
  // Undo/Redo
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
}

export interface GridCustomizerStoreActions {
  getModuleState: <T>(moduleId: string) => T;
  setModuleState: <T>(moduleId: string, updater: (prev: T) => T) => void;
  setActiveProfile: (profileId: string | null) => void;
  setDefaultProfile: (profileId: string | null) => void;
  setDirty: (dirty: boolean) => void;
  setActiveSettingsModule: (moduleId: string | null) => void;
  setSettingsOpen: (open: boolean) => void;
  resetModuleStates: (modules: AnyModule[]) => void;
  // Undo/Redo
  pushUndoPoint: (label: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  // Clear All
  clearAll: (modules: AnyModule[], gridId: string) => void;
}

export type GridCustomizerStore = GridCustomizerStoreState & GridCustomizerStoreActions;
export type GridStore = UseBoundStore<StoreApi<GridCustomizerStore>>;

const storeCache = new Map<string, GridStore>();

export function createGridStore(gridId: string, modules: AnyModule[]): GridStore {
  if (storeCache.has(gridId)) {
    return storeCache.get(gridId)!;
  }

  const initialModuleStates: Record<string, unknown> = {};
  for (const mod of modules) {
    initialModuleStates[mod.id] = mod.getInitialState();
  }

  const store = create<GridCustomizerStore>((set, get) => ({
    modules: initialModuleStates,
    activeProfileId: null,
    defaultProfileId: null,
    isDirty: false,
    activeSettingsModule: modules[0]?.id ?? null,
    settingsOpen: false,
    undoStack: [],
    redoStack: [],

    getModuleState: <T>(moduleId: string): T => {
      return get().modules[moduleId] as T;
    },

    setModuleState: <T>(moduleId: string, updater: (prev: T) => T): void => {
      set((state) => ({
        modules: {
          ...state.modules,
          [moduleId]: updater(state.modules[moduleId] as T),
        },
        isDirty: true,
      }));
    },

    setActiveProfile: (profileId) => set({ activeProfileId: profileId }),
    setDefaultProfile: (profileId) => set({ defaultProfileId: profileId }),
    setDirty: (dirty) => set({ isDirty: dirty }),
    setActiveSettingsModule: (moduleId) => set({ activeSettingsModule: moduleId }),
    setSettingsOpen: (open) => set({ settingsOpen: open }),

    resetModuleStates: (mods) => {
      const fresh: Record<string, unknown> = {};
      for (const mod of mods) {
        fresh[mod.id] = mod.getInitialState();
      }
      set({ modules: fresh, isDirty: false });
    },

    // ─── Undo/Redo ─────────────────────────────────────────────────────────

    pushUndoPoint: (label: string) => {
      const state = get();
      const entry: HistoryEntry = {
        modules: JSON.parse(JSON.stringify(state.modules)),
        label,
        timestamp: Date.now(),
      };
      set({
        undoStack: [...state.undoStack.slice(-(MAX_UNDO_HISTORY - 1)), entry],
        redoStack: [], // New action clears redo
      });
    },

    undo: () => {
      const state = get();
      if (state.undoStack.length === 0) return;
      const prev = state.undoStack[state.undoStack.length - 1];
      const redoEntry: HistoryEntry = {
        modules: JSON.parse(JSON.stringify(state.modules)),
        label: prev.label,
        timestamp: Date.now(),
      };
      set({
        modules: prev.modules,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, redoEntry],
        isDirty: true,
      });
    },

    redo: () => {
      const state = get();
      if (state.redoStack.length === 0) return;
      const next = state.redoStack[state.redoStack.length - 1];
      const undoEntry: HistoryEntry = {
        modules: JSON.parse(JSON.stringify(state.modules)),
        label: next.label,
        timestamp: Date.now(),
      };
      set({
        modules: next.modules,
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [...state.undoStack, undoEntry],
        isDirty: true,
      });
    },

    canUndo: () => get().undoStack.length > 0,
    canRedo: () => get().redoStack.length > 0,

    // ─── Clear All ─────────────────────────────────────────────────────────

    clearAll: (mods: AnyModule[], gId: string) => {
      // Push undo point before clearing (so user can Ctrl+Z to recover)
      get().pushUndoPoint('Before Clear All');
      const fresh: Record<string, unknown> = {};
      for (const mod of mods) {
        fresh[mod.id] = mod.getInitialState();
      }
      try { localStorage.removeItem(`gc-state:${gId}`); } catch { /* */ }
      set({ modules: fresh, isDirty: false });
    },
  }));

  storeCache.set(gridId, store);
  return store;
}

export function destroyGridStore(gridId: string): void {
  storeCache.delete(gridId);
}
