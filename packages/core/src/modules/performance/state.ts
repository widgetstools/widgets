export interface PerformanceState {
  suppressColumnVirtualisation: boolean;
  rowBuffer: number;
  debounceVerticalScrollbar: boolean;
  suppressAnimationFrame: boolean;
  suppressRowHoverHighlight: boolean;
  groupDefaultExpanded: number;
}

export const INITIAL_PERFORMANCE: PerformanceState = {
  suppressColumnVirtualisation: false,
  rowBuffer: 10,
  debounceVerticalScrollbar: true,
  suppressAnimationFrame: false,
  suppressRowHoverHighlight: false,
  groupDefaultExpanded: 0,
};
