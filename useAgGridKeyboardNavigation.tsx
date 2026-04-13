/**
 * useAgGridKeyboardNavigation.tsx
 * ---------------------------------------------------------------------------
 * Excel-parity keyboard navigation for AG-Grid v34+ (verified v35.2.1).
 *
 * Solves three long-standing pain points in large grids (600+ columns):
 *   1. Held-key rapid repeat overwhelming AG-Grid's render pipeline
 *      (see ag-grid issues #6208 / AG-8072, #1923)
 *   2. Shift+Arrow range selection losing columns on direction reversal
 *      (see ag-grid issue #4815)
 *   3. Focused column falling off-screen horizontally
 *      (see ag-grid issues #3024, #6478)
 *
 * Design:
 *   - Adaptive throttling: rAF coalescing for arrows (self-tuning to the
 *     grid's actual frame budget), fixed interval for PageUp/Down/Home/End.
 *   - Excel-style range extension: selections extend from the ORIGINAL anchor,
 *     so reversing direction shrinks the selection instead of abandoning it.
 *   - Full Ctrl/Ctrl+Shift combo support: jump-to-edge and select-to-edge.
 *   - Auto column-visibility on cellFocused.
 *
 * Uses only the public AG-Grid API: no private navigateToNextCell calls.
 * ---------------------------------------------------------------------------
 */

import { useEffect, useRef, useCallback } from 'react';
import type {
  GridApi,
  CellFocusedEvent,
  CellPosition,
  Column,
  CellRange,
} from 'ag-grid-community';

/* ========================================================================== */
/*                                   TYPES                                    */
/* ========================================================================== */

export interface KeyboardNavigationOptions {
  /** Throttle for PageUp/PageDown/Home/End in ms. Default 100. */
  pageKeyThrottleMs?: number;
  /** Auto-scroll focused column into view on cellFocused. Default true. */
  ensureColumnVisibleOnFocus?: boolean;
  /** Enable Ctrl+Arrow edge jumps. Default true. */
  enableCtrlCombos?: boolean;
  /** Enable Shift+Arrow range extension. Default true. */
  enableRangeSelection?: boolean;
}

interface AnchorRef {
  rowIndex: number;
  colId: string;
}

const NAV_KEYS = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Tab', 'Home', 'End', 'PageUp', 'PageDown',
]);

const PAGE_KEYS = new Set(['PageUp', 'PageDown', 'Home', 'End']);

/* ========================================================================== */
/*                                    HOOK                                    */
/* ========================================================================== */

export function useAgGridKeyboardNavigation(
  gridApi: GridApi | null,
  gridReady: boolean,
  options: KeyboardNavigationOptions = {}
): void {
  const {
    pageKeyThrottleMs = 100,
    ensureColumnVisibleOnFocus = true,
    enableCtrlCombos = true,
    enableRangeSelection = true,
  } = options;

  /** Anchor cell for Excel-style range extension. Reset on any
   *  non-shift navigation or mouse click. */
  const anchorRef = useRef<AnchorRef | null>(null);

  /** Pending navigation request, coalesced via rAF for arrow keys. */
  const pendingNavRef = useRef<KeyboardEvent | null>(null);
  const rafIdRef = useRef<number | null>(null);

  /** Last page-key timestamp for fixed-interval throttle. */
  const lastPageKeyTsRef = useRef(0);

  /* -------------------------- navigation primitives ----------------------- */

  const getAllCols = useCallback((): Column[] => {
    return gridApi?.getAllDisplayedColumns() ?? [];
  }, [gridApi]);

  const getRowCount = useCallback((): number => {
    return gridApi?.getDisplayedRowCount() ?? 0;
  }, [gridApi]);

  const focusAndExtend = useCallback(
    (newRow: number, newCol: Column, shiftKey: boolean) => {
      if (!gridApi) return;

      // Clamp to valid range
      const maxRow = getRowCount() - 1;
      const clampedRow = Math.max(0, Math.min(maxRow, newRow));

      // Focus the target cell
      gridApi.setFocusedCell(clampedRow, newCol);
      gridApi.ensureIndexVisible(clampedRow);
      gridApi.ensureColumnVisible(newCol);

      // Range extension: from anchor to new focus (Excel-style)
      if (shiftKey && enableRangeSelection && anchorRef.current) {
        const anchor = anchorRef.current;
        const anchorCol = gridApi.getColumn(anchor.colId);
        if (!anchorCol) return;

        const cols = getAllCols();
        const anchorIdx = cols.findIndex((c) => c.getColId() === anchor.colId);
        const newIdx = cols.findIndex((c) => c.getColId() === newCol.getColId());
        if (anchorIdx < 0 || newIdx < 0) return;

        const [lo, hi] = anchorIdx <= newIdx ? [anchorIdx, newIdx] : [newIdx, anchorIdx];
        const columnsInRange = cols.slice(lo, hi + 1);

        gridApi.clearRangeSelection?.();
        gridApi.addCellRange({
          rowStartIndex: Math.min(anchor.rowIndex, clampedRow),
          rowEndIndex: Math.max(anchor.rowIndex, clampedRow),
          columns: columnsInRange,
        });
      } else if (!shiftKey) {
        // Non-shift nav resets the anchor to the new position
        anchorRef.current = { rowIndex: clampedRow, colId: newCol.getColId() };
        gridApi.clearRangeSelection?.();
      }
    },
    [gridApi, getAllCols, getRowCount, enableRangeSelection]
  );

  /* ----------------------- per-key navigation handlers -------------------- */

  const handleArrow = useCallback(
    (key: string, event: KeyboardEvent, from: CellPosition) => {
      if (!gridApi) return;
      const cols = getAllCols();
      if (!cols.length) return;

      const curColIdx = cols.findIndex((c) => c === from.column);
      if (curColIdx < 0) return;

      let newRow = from.rowIndex;
      let newColIdx = curColIdx;
      const ctrl = event.ctrlKey || event.metaKey;

      switch (key) {
        case 'ArrowUp':
          newRow = ctrl && enableCtrlCombos ? 0 : from.rowIndex - 1;
          break;
        case 'ArrowDown':
          newRow = ctrl && enableCtrlCombos ? getRowCount() - 1 : from.rowIndex + 1;
          break;
        case 'ArrowLeft':
          newColIdx = ctrl && enableCtrlCombos ? 0 : curColIdx - 1;
          break;
        case 'ArrowRight':
          newColIdx = ctrl && enableCtrlCombos ? cols.length - 1 : curColIdx + 1;
          break;
      }

      newColIdx = Math.max(0, Math.min(cols.length - 1, newColIdx));
      focusAndExtend(newRow, cols[newColIdx], event.shiftKey);
    },
    [gridApi, getAllCols, getRowCount, focusAndExtend, enableCtrlCombos]
  );

  const handleTab = useCallback(
    (event: KeyboardEvent, from: CellPosition) => {
      if (!gridApi) return;
      const cols = getAllCols();
      const curIdx = cols.findIndex((c) => c === from.column);
      if (curIdx < 0) return;

      const forward = !event.shiftKey;
      let nextIdx = forward ? curIdx + 1 : curIdx - 1;
      let nextRow = from.rowIndex;

      if (nextIdx >= cols.length) {
        nextIdx = 0;
        nextRow = Math.min(getRowCount() - 1, from.rowIndex + 1);
      } else if (nextIdx < 0) {
        nextIdx = cols.length - 1;
        nextRow = Math.max(0, from.rowIndex - 1);
      }

      // Tab never extends a range
      anchorRef.current = null;
      focusAndExtend(nextRow, cols[nextIdx], false);
    },
    [gridApi, getAllCols, getRowCount, focusAndExtend]
  );

  const handlePageKey = useCallback(
    (key: string, event: KeyboardEvent, from: CellPosition) => {
      if (!gridApi) return;
      const cols = getAllCols();
      const curColIdx = cols.findIndex((c) => c === from.column);
      if (curColIdx < 0) return;

      const first = gridApi.getFirstDisplayedRowIndex();
      const last = gridApi.getLastDisplayedRowIndex();
      const pageSize = Math.max(1, last - first);

      let newRow = from.rowIndex;
      let newColIdx = curColIdx;

      switch (key) {
        case 'PageUp':
          newRow = Math.max(0, from.rowIndex - pageSize);
          break;
        case 'PageDown':
          newRow = Math.min(getRowCount() - 1, from.rowIndex + pageSize);
          break;
        case 'Home':
          if (event.ctrlKey || event.metaKey) {
            newRow = 0;
            newColIdx = 0;
          } else {
            newColIdx = 0;
          }
          break;
        case 'End':
          if (event.ctrlKey || event.metaKey) {
            newRow = getRowCount() - 1;
            newColIdx = cols.length - 1;
          } else {
            newColIdx = cols.length - 1;
          }
          break;
      }

      focusAndExtend(newRow, cols[newColIdx], event.shiftKey);
    },
    [gridApi, getAllCols, getRowCount, focusAndExtend]
  );

  /* -------------------------- dispatch + throttling ----------------------- */

  const dispatchNav = useCallback(
    (event: KeyboardEvent) => {
      if (!gridApi) return;
      const from = gridApi.getFocusedCell();
      if (!from || !from.column) return;

      const key = event.key;
      if (key === 'Tab') {
        handleTab(event, from);
      } else if (PAGE_KEYS.has(key)) {
        handlePageKey(key, event, from);
      } else {
        handleArrow(key, event, from);
      }
    },
    [gridApi, handleArrow, handleTab, handlePageKey]
  );

  const flushPending = useCallback(() => {
    rafIdRef.current = null;
    const ev = pendingNavRef.current;
    pendingNavRef.current = null;
    if (ev) dispatchNav(ev);
  }, [dispatchNav]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!gridReady || !gridApi) return;
      if (!NAV_KEYS.has(event.key)) return;

      // Don't intercept when a cell editor is active — let AG-Grid handle it
      const editingCells = gridApi.getEditingCells?.();
      if (editingCells && editingCells.length > 0) return;

      // Seed the anchor on the first shift-nav from a non-extended state
      if (event.shiftKey && enableRangeSelection && !anchorRef.current) {
        const focused = gridApi.getFocusedCell();
        if (focused?.column) {
          anchorRef.current = {
            rowIndex: focused.rowIndex,
            colId: focused.column.getColId(),
          };
        }
      }

      event.preventDefault();
      event.stopPropagation();

      if (PAGE_KEYS.has(event.key)) {
        // Fixed-interval throttle for big jumps
        const now = performance.now();
        if (now - lastPageKeyTsRef.current < pageKeyThrottleMs) return;
        lastPageKeyTsRef.current = now;
        dispatchNav(event);
      } else {
        // rAF coalescing for arrows + Tab: keep only the most recent event,
        // flush once per frame. Self-tunes to the grid's actual render budget.
        pendingNavRef.current = event;
        if (rafIdRef.current == null) {
          rafIdRef.current = requestAnimationFrame(flushPending);
        }
      }
    },
    [gridReady, gridApi, enableRangeSelection, pageKeyThrottleMs, dispatchNav, flushPending]
  );

  /* ----------------------------- lifecycle -------------------------------- */

  useEffect(() => {
    if (!gridReady || !gridApi) return;

    // Install on the grid root for scoping — falls back to document if not found
    const root =
      (document.querySelector('.ag-root-wrapper') as HTMLElement | null) ??
      document.body;

    root.addEventListener('keydown', onKeyDown, { capture: true });

    // Auto column-visibility on focus change
    const onCellFocused = (params: CellFocusedEvent) => {
      if (!ensureColumnVisibleOnFocus || !params.column) return;
      try {
        gridApi.ensureColumnVisible(params.column);
      } catch (err) {
        console.error('[useAgGridKeyboardNavigation] ensureColumnVisible failed', err);
      }
    };
    gridApi.addEventListener('cellFocused', onCellFocused);

    // Mouse clicks reset the range anchor to the clicked cell
    const onMouseDown = () => {
      anchorRef.current = null;
    };
    root.addEventListener('mousedown', onMouseDown, true);

    return () => {
      root.removeEventListener('keydown', onKeyDown, { capture: true } as any);
      root.removeEventListener('mousedown', onMouseDown, true);
      gridApi.removeEventListener('cellFocused', onCellFocused);
      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      pendingNavRef.current = null;
    };
  }, [gridReady, gridApi, onKeyDown, ensureColumnVisibleOnFocus]);
}
