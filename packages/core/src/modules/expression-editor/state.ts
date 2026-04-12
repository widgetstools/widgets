import type { FunctionDefinition } from '../../expression/types';

export interface ExpressionEditorState {
  customFunctions: Array<{
    name: string;
    category: string;
    description: string;
    signature: string;
  }>;
  recentExpressions: string[];
  maxRecentExpressions: number;
}

export const INITIAL_EXPRESSION_EDITOR: ExpressionEditorState = {
  customFunctions: [],
  recentExpressions: [],
  maxRecentExpressions: 20,
};
