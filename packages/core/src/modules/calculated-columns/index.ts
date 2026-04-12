import type { ColDef, ColGroupDef, ValueGetterParams } from 'ag-grid-community';
import type { GridCustomizerModule } from '../../types/module';
import type { GridContext } from '../../types/common';
import { ExpressionEngine } from '../../expression';
import { INITIAL_CALCULATED_COLUMNS, type CalculatedColumnsState } from './state';
import { CalculatedColumnsPanel } from './CalculatedColumnsPanel';

const engine = new ExpressionEngine();

export const calculatedColumnsModule: GridCustomizerModule<CalculatedColumnsState> = {
  id: 'calculated-columns',
  name: 'Calculated Columns',
  icon: 'Sigma',
  priority: 30,

  getInitialState: () => ({ ...INITIAL_CALCULATED_COLUMNS }),

  transformColumnDefs(
    defs: (ColDef | ColGroupDef)[],
    state: CalculatedColumnsState,
    _ctx: GridContext,
  ): (ColDef | ColGroupDef)[] {
    if (state.columns.length === 0) return defs;

    const virtualDefs: ColDef[] = state.columns.map((calc) => {
      // Pre-parse the expression for performance (avoid re-parsing per row)
      let parsedAst: ReturnType<typeof engine.parse> | null = null;
      try {
        parsedAst = engine.parse(calc.expression);
      } catch {
        // Invalid expression — valueGetter returns null
      }

      const colDef: ColDef = {
        colId: calc.colId,
        headerName: calc.headerName,
        editable: false,
        valueGetter: (params: ValueGetterParams) => {
          if (!parsedAst || !params.data) return null;
          try {
            return engine.evaluate(parsedAst, {
              x: null,
              value: null,
              data: params.data,
              columns: params.data,
            });
          } catch {
            return null;
          }
        },
      };

      if (calc.initialWidth) colDef.initialWidth = calc.initialWidth;
      if (calc.initialHide) colDef.initialHide = calc.initialHide;
      if (calc.initialPinned) colDef.initialPinned = calc.initialPinned;

      if (calc.valueFormatterTemplate) {
        const fmtExpr = calc.valueFormatterTemplate;
        colDef.valueFormatter = (params) => {
          if (params.value == null) return '';
          try {
            const result = engine.parseAndEvaluate(fmtExpr, {
              x: params.value,
              value: params.value,
              data: params.data ?? {},
              columns: params.data ?? {},
            });
            return String(result ?? params.value);
          } catch {
            return String(params.value);
          }
        };
      }

      return colDef;
    });

    return [...defs, ...virtualDefs];
  },

  serialize: (state) => state,
  deserialize: (data) => ({
    ...INITIAL_CALCULATED_COLUMNS,
    ...(data as Partial<CalculatedColumnsState>),
  }),

  SettingsPanel: CalculatedColumnsPanel,
};

export type { CalculatedColumnDef, CalculatedColumnsState } from './state';
