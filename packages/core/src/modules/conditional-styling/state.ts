import type { ThemeAwareStyle } from '../../types/common';

export interface ConditionalRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  scope: RuleScope;
  expression: string;
  style: ThemeAwareStyle;
}

export type RuleScope =
  | { type: 'cell'; columns: string[] }
  | { type: 'row' };

export interface ConditionalStylingState {
  rules: ConditionalRule[];
}

export const INITIAL_CONDITIONAL_STYLING: ConditionalStylingState = {
  rules: [],
};
