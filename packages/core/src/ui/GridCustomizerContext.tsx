import React, { createContext, useContext } from 'react';
import type { GridStore } from '../stores/createGridStore';
import type { GridCustomizerCore } from '../core/GridCustomizerCore';

interface GridCustomizerContextValue {
  store: GridStore;
  core: GridCustomizerCore;
}

const Ctx = createContext<GridCustomizerContextValue | null>(null);

export function GridCustomizerProvider({
  store,
  core,
  children,
}: GridCustomizerContextValue & { children: React.ReactNode }) {
  return <Ctx.Provider value={{ store, core }}>{children}</Ctx.Provider>;
}

export function useGridCustomizerStore(): GridStore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useGridCustomizerStore must be used within GridCustomizerProvider');
  return ctx.store;
}

export function useGridCustomizerCore(): GridCustomizerCore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useGridCustomizerCore must be used within GridCustomizerProvider');
  return ctx.core;
}
