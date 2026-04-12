import type { ColDef, ColGroupDef, GridOptions } from 'ag-grid-community';
import type { GridContext, ModuleContext } from './common';
import type { ComponentType } from 'react';

export interface GridCustomizerModule<TState = unknown> {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly dependencies?: string[];
  readonly priority: number;

  getInitialState(): TState;

  onRegister?(ctx: ModuleContext): void;
  onGridReady?(ctx: GridContext): void;
  onGridDestroy?(ctx: GridContext): void;

  transformColumnDefs?(
    defs: (ColDef | ColGroupDef)[],
    state: TState,
    ctx: GridContext,
  ): (ColDef | ColGroupDef)[];

  transformGridOptions?(
    opts: Partial<GridOptions>,
    state: TState,
    ctx: GridContext,
  ): Partial<GridOptions>;

  serialize(state: TState): unknown;
  deserialize(data: unknown): TState;

  SettingsPanel?: ComponentType<SettingsPanelProps>;
}

export interface SettingsPanelProps {
  gridId: string;
}

export type AnyModule = GridCustomizerModule<any>;
