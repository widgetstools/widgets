import { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { GridStore, GridCustomizerStore } from './createGridStore';

export function useModuleState<T>(
  useStore: GridStore,
  moduleId: string,
): [T, (updater: (prev: T) => T) => void] {
  const state = useStore(
    useShallow((s: GridCustomizerStore) => s.modules[moduleId] as T),
  );

  const setState = useCallback(
    (updater: (prev: T) => T) => {
      useStore.getState().setModuleState(moduleId, updater);
    },
    [useStore, moduleId],
  );

  return [state, setState];
}
