import { useCallback, useEffect, useState } from 'react';
import type { ProfileMeta, ProfileSnapshot } from '../types/profile';
import type { StorageAdapter } from '../persistence/StorageAdapter';
import type { GridCustomizerCore } from '../core/GridCustomizerCore';
import type { GridStore } from '../stores/createGridStore';
import { CURRENT_SCHEMA_VERSION } from '../types/profile';

export interface UseProfileManagerOptions {
  gridId: string;
  core: GridCustomizerCore;
  store: GridStore;
  storage: StorageAdapter;
}

export function useProfileManager(options: UseProfileManagerOptions) {
  const { gridId, core, store, storage } = options;
  const [profiles, setProfiles] = useState<ProfileMeta[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const list = await storage.list(gridId);
    setProfiles(list);
  }, [storage, gridId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(
    async (name: string, description?: string) => {
      setLoading(true);
      try {
        const api = core.getGridApi();
        const agGridState = api ? (api as any).getState?.() ?? null : null;
        const moduleStates = core.serializeAll();

        const profileId = `${gridId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const snapshot: ProfileSnapshot = {
          version: CURRENT_SCHEMA_VERSION,
          gridId,
          name,
          description,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          agGridState,
          modules: moduleStates,
        };

        await storage.save(profileId, snapshot);
        store.getState().setActiveProfile(profileId);
        store.getState().setDirty(false);
        core.eventBus.emit('profile:saved', { gridId, profileId });
        await refresh();
        return profileId;
      } finally {
        setLoading(false);
      }
    },
    [gridId, core, store, storage, refresh],
  );

  const load = useCallback(
    async (profileId: string) => {
      setLoading(true);
      try {
        const snapshot = await storage.load(profileId);
        if (!snapshot) return;

        core.deserializeAll(snapshot.modules);

        const api = core.getGridApi();
        if (api && snapshot.agGridState && typeof (api as any).setState === 'function') {
          (api as any).setState(snapshot.agGridState);
        }

        store.getState().setActiveProfile(profileId);
        store.getState().setDirty(false);
        core.eventBus.emit('profile:loaded', { gridId, profileId });
        await refresh();
      } finally {
        setLoading(false);
      }
    },
    [gridId, core, store, storage, refresh],
  );

  const remove = useCallback(
    async (profileId: string) => {
      await storage.delete(profileId);
      if (store.getState().activeProfileId === profileId) {
        store.getState().setActiveProfile(null);
      }
      core.eventBus.emit('profile:deleted', { gridId, profileId });
      await refresh();
    },
    [gridId, core, store, storage, refresh],
  );

  const setDefault = useCallback(
    async (profileId: string | null) => {
      await storage.setDefault(gridId, profileId);
      store.getState().setDefaultProfile(profileId);
      await refresh();
    },
    [gridId, store, storage, refresh],
  );

  const exportProfile = useCallback(
    async (profileId: string) => {
      return storage.exportJson(profileId);
    },
    [storage],
  );

  const importProfile = useCallback(
    async (json: string) => {
      const profileId = await storage.importJson(json);
      await refresh();
      return profileId;
    },
    [storage, refresh],
  );

  const rename = useCallback(
    async (profileId: string, newName: string) => {
      const snapshot = await storage.load(profileId);
      if (!snapshot) return;
      snapshot.name = newName;
      snapshot.updatedAt = Date.now();
      await storage.save(profileId, snapshot);
      await refresh();
    },
    [storage, refresh],
  );

  return {
    profiles,
    loading,
    save,
    load,
    remove,
    rename,
    setDefault,
    exportProfile,
    importProfile,
    refresh,
  };
}
