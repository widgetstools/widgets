import type { ColDef, ColGroupDef, GridApi, GridOptions, GetRowIdParams } from 'ag-grid-community';
import type { AnyModule } from '../types/module';
import type { GridContext, ModuleContext } from '../types/common';
import { EventBus } from './EventBus';
import { CssInjector } from './CssInjector';
import { GridLifecycle } from './lifecycle';

export interface GridCustomizerCoreOptions {
  gridId: string;
  modules: AnyModule[];
  getModuleState: <T>(moduleId: string) => T;
  setModuleState: <T>(moduleId: string, updater: (prev: T) => T) => void;
  rowIdField?: string;
}

export class GridCustomizerCore {
  readonly gridId: string;
  readonly eventBus: EventBus;
  readonly cssInjector: CssInjector;
  readonly lifecycle: GridLifecycle;

  private modules: AnyModule[] = [];
  private sortedModules: AnyModule[] = [];
  private gridApi: GridApi | null = null;
  private rowIdField: string;
  private getModuleStateFn: <T>(moduleId: string) => T;
  private setModuleStateFn: <T>(moduleId: string, updater: (prev: T) => T) => void;

  constructor(options: GridCustomizerCoreOptions) {
    this.gridId = options.gridId;
    this.rowIdField = options.rowIdField ?? 'id';
    this.getModuleStateFn = options.getModuleState;
    this.setModuleStateFn = options.setModuleState;

    this.eventBus = new EventBus();
    this.cssInjector = new CssInjector(options.gridId);
    this.lifecycle = new GridLifecycle();

    this.registerModules(options.modules);
  }

  private registerModules(modules: AnyModule[]): void {
    this.modules = modules;
    this.sortedModules = [...modules].sort((a, b) => a.priority - b.priority);

    const ctx = this.createModuleContext();
    for (const mod of this.sortedModules) {
      mod.onRegister?.(ctx);
    }
  }

  onGridReady(api: GridApi): void {
    this.gridApi = api;
    const ctx = this.createGridContext();
    if (!ctx) return;

    this.lifecycle.register(this.gridId, () => {
      this.cssInjector.destroy();
      this.eventBus.destroy();
    });

    for (const mod of this.sortedModules) {
      mod.onGridReady?.(ctx);
    }
  }

  onGridDestroy(): void {
    const ctx = this.createGridContext();
    if (ctx) {
      for (const mod of this.sortedModules) {
        mod.onGridDestroy?.(ctx);
      }
    }
    this.lifecycle.destroy(this.gridId);
    this.gridApi = null;
  }

  transformColumnDefs(baseDefs: (ColDef | ColGroupDef)[]): (ColDef | ColGroupDef)[] {
    const ctx = this.createGridContext();
    let defs = baseDefs;

    for (const mod of this.sortedModules) {
      if (!mod.transformColumnDefs) continue;
      const state = this.getModuleStateFn(mod.id);
      defs = mod.transformColumnDefs(defs, state, ctx!);
    }

    return defs;
  }

  transformGridOptions(baseOptions: Partial<GridOptions>): Partial<GridOptions> {
    const ctx = this.createGridContext();
    let opts = { ...baseOptions };

    // Always inject getRowId for memory safety
    if (!opts.getRowId) {
      const field = this.rowIdField;
      opts.getRowId = (params: GetRowIdParams) => String(params.data[field]);
    }

    for (const mod of this.sortedModules) {
      if (!mod.transformGridOptions) continue;
      const state = this.getModuleStateFn(mod.id);
      opts = mod.transformGridOptions(opts, state, ctx!);
    }

    return opts;
  }

  getModules(): AnyModule[] {
    return this.sortedModules;
  }

  getModule(id: string): AnyModule | undefined {
    return this.modules.find((m) => m.id === id);
  }

  getGridApi(): GridApi | null {
    return this.gridApi;
  }

  serializeAll(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const mod of this.modules) {
      const state = this.getModuleStateFn(mod.id);
      result[mod.id] = mod.serialize(state);
    }
    return result;
  }

  deserializeAll(data: Record<string, unknown>): void {
    for (const mod of this.modules) {
      const serialized = data[mod.id];
      if (serialized !== undefined) {
        const state = mod.deserialize(serialized);
        this.setModuleStateFn(mod.id, () => state);
      }
    }
  }

  private createModuleContext(): ModuleContext {
    return {
      gridId: this.gridId,
      eventBus: this.eventBus,
      cssInjector: this.cssInjector,
      expressionEngine: null as any, // Will be set when expression module registers
      getGridContext: () => this.createGridContext(),
      getModuleState: this.getModuleStateFn,
      setModuleState: this.setModuleStateFn,
    };
  }

  private createGridContext(): GridContext | null {
    if (!this.gridApi) return null;
    const field = this.rowIdField;
    return {
      gridId: this.gridId,
      gridApi: this.gridApi,
      getRowId: (params: GetRowIdParams) => String(params.data[field]),
    };
  }
}
