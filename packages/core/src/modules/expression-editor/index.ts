import type { GridCustomizerModule } from '../../types/module';
import { INITIAL_EXPRESSION_EDITOR, type ExpressionEditorState } from './state';
import { ExpressionEditorPanel } from './ExpressionEditorPanel';

export const expressionEditorModule: GridCustomizerModule<ExpressionEditorState> = {
  id: 'expression-editor',
  name: 'Expression Editor',
  icon: 'Code',
  priority: 100,

  getInitialState: () => ({ ...INITIAL_EXPRESSION_EDITOR }),

  // Service module — no transforms. Provides the expression engine UI
  // used by Calculated Columns, Conditional Styling, Named Queries, etc.

  serialize: (state) => state,
  deserialize: (data) => ({
    ...INITIAL_EXPRESSION_EDITOR,
    ...(data as Partial<ExpressionEditorState>),
  }),

  SettingsPanel: ExpressionEditorPanel,
};

export type { ExpressionEditorState } from './state';
