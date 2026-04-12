import type { GridOptions } from 'ag-grid-community';
import type { GridCustomizerModule } from '../../types/module';
import type { GridContext } from '../../types/common';
import { INITIAL_PERFORMANCE, type PerformanceState } from './state';
import { PerformancePanel } from './PerformancePanel';

export const performanceModule: GridCustomizerModule<PerformanceState> = {
  id: 'performance',
  name: 'Performance',
  icon: 'Gauge',
  priority: 80,

  getInitialState: () => ({ ...INITIAL_PERFORMANCE }),

  transformGridOptions(
    opts: Partial<GridOptions>,
    state: PerformanceState,
    _ctx: GridContext,
  ): Partial<GridOptions> {
    return {
      ...opts,
      suppressColumnVirtualisation: state.suppressColumnVirtualisation,
      rowBuffer: state.rowBuffer,
      debounceVerticalScrollbar: state.debounceVerticalScrollbar,
      suppressAnimationFrame: state.suppressAnimationFrame,
      suppressRowHoverHighlight: state.suppressRowHoverHighlight,
      groupDefaultExpanded: state.groupDefaultExpanded,
    };
  },

  serialize: (state) => state,
  deserialize: (data) => ({
    ...INITIAL_PERFORMANCE,
    ...(data as Partial<PerformanceState>),
  }),

  SettingsPanel: PerformancePanel,
};

export type { PerformanceState } from './state';
