import type { GridApi, ColDef, ColGroupDef, GridOptions, GetRowIdFunc } from 'ag-grid-community';
import type { ExpressionNode, EvaluationContext } from '../expression/types';

// ─── Grid Context ────────────────────────────────────────────────────────────

export interface GridContext {
  readonly gridId: string;
  readonly gridApi: GridApi;
  readonly getRowId: GetRowIdFunc;
}

export interface ModuleContext {
  readonly gridId: string;
  readonly eventBus: EventBusInstance;
  readonly cssInjector: CssInjectorInstance;
  readonly expressionEngine: ExpressionEngineInstance;
  readonly getGridContext: () => GridContext | null;
  readonly getModuleState: <T>(moduleId: string) => T;
  readonly setModuleState: <T>(moduleId: string, updater: (prev: T) => T) => void;
}

// ─── CSS Injector ────────────────────────────────────────────────────────────

export interface CssInjectorInstance {
  addRule(ruleId: string, cssText: string): void;
  removeRule(ruleId: string): void;
  clear(): void;
  destroy(): void;
}

// ─── Event Bus ───────────────────────────────────────────────────────────────

export interface EventBusInstance {
  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void;
  on<K extends keyof EventMap>(event: K, handler: (payload: EventMap[K]) => void): () => void;
}

// ─── Expression Engine ───────────────────────────────────────────────────────

export interface ExpressionEngineInstance {
  parse(expression: string): ExpressionNode;
  evaluate(node: ExpressionNode, context: EvaluationContext): unknown;
  /** Parse and evaluate in one call — convenience method */
  parseAndEvaluate(expression: string, context: EvaluationContext): unknown;
  tryCompileToAgString(node: ExpressionNode): string | null;
  validate(expression: string): ValidationResult;
}

export type { ExpressionNode, EvaluationContext };

export interface ValidationResult {
  valid: boolean;
  errors: Array<{ message: string; position: number; length: number }>;
}

// ─── Event Map ───────────────────────────────────────────────────────────────

export interface EventMap {
  'column:defsChanged': { gridId: string; defs: (ColDef | ColGroupDef)[] };
  'profile:loaded': { gridId: string; profileId: string };
  'profile:saved': { gridId: string; profileId: string };
  'profile:deleted': { gridId: string; profileId: string };
  'styling:rulesChanged': { gridId: string };
  'flash:triggered': { gridId: string; rowNodeIds: string[]; columns: string[] };
  'theme:changed': { theme: 'light' | 'dark' };
  'filter:applied': { gridId: string };
  'state:dirty': { gridId: string; moduleId: string };
  'module:stateChanged': { gridId: string; moduleId: string };
}

// ─── CSS Style Properties ────────────────────────────────────────────────────

export interface CellStyleProperties {
  // Background
  backgroundColor?: string;
  // Text
  color?: string;
  fontWeight?: string;
  fontStyle?: string;
  fontSize?: string;
  fontFamily?: string;
  textAlign?: string;
  textDecoration?: string;
  // Borders (granular)
  borderTopColor?: string;
  borderTopWidth?: string;
  borderTopStyle?: string;
  borderRightColor?: string;
  borderRightWidth?: string;
  borderRightStyle?: string;
  borderBottomColor?: string;
  borderBottomWidth?: string;
  borderBottomStyle?: string;
  borderLeftColor?: string;
  borderLeftWidth?: string;
  borderLeftStyle?: string;
  // Padding
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
}

export interface ThemeAwareStyle {
  light: CellStyleProperties;
  dark: CellStyleProperties;
}

// ─── Column Style Template (reusable, stored once) ──────────────────────────

export interface ColumnTemplate {
  id: string;
  name: string;
  description?: string;
  createdAt: number;    // Date.now() at creation
  updatedAt: number;    // Date.now() on any property change
  // Styling
  headerStyle?: CellStyleProperties;
  cellStyle?: CellStyleProperties;
  // Behavior
  cellEditorName?: string;
  cellEditorParams?: Record<string, unknown>;
  cellRendererName?: string;
  valueFormatterTemplate?: string;
  sortable?: boolean;
  filterable?: boolean;
  resizable?: boolean;
}

// ─── Column Assignment (lightweight per-column, references templates) ────────

export interface ColumnAssignment {
  colId: string;
  templateIds?: string[];   // Ordered list of templates to compose (newest updatedAt wins per-key)
  /** @deprecated Use templateIds instead */
  templateId?: string;
  // Column-specific properties (never in templates)
  headerName?: string;
  headerTooltip?: string;
  initialWidth?: number;
  initialHide?: boolean;
  initialPinned?: 'left' | 'right' | boolean;
  // Per-column style overrides (highest precedence, above all templates)
  headerStyleOverrides?: CellStyleProperties;
  cellStyleOverrides?: CellStyleProperties;
  // Per-column behavior overrides
  cellEditorName?: string;
  cellEditorParams?: Record<string, unknown>;
  cellRendererName?: string;
  valueFormatterTemplate?: string;
  sortable?: boolean;
  filterable?: boolean;
  resizable?: boolean;
}

// ─── Column Override (deprecated — kept for backward compat) ─────────────────

/** @deprecated Use ColumnTemplate + ColumnAssignment instead */
export interface ColumnOverride {
  colId: string;
  headerName?: string;
  headerTooltip?: string;
  headerStyle?: CellStyleProperties;
  initialWidth?: number;
  initialHide?: boolean;
  initialPinned?: 'left' | 'right' | boolean;
  valueFormatterTemplate?: string;
  cellRendererName?: string;
  cellEditorName?: string;
  cellEditorParams?: Record<string, unknown>;
  cellStyle?: CellStyleProperties;
  resizable?: boolean;
  sortable?: boolean;
  filterable?: boolean;
}
