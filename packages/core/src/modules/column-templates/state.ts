import type { ColumnTemplate } from '../../types/common';

export interface TypeDefaults {
  numeric?: string;   // templateId for all numeric columns
  date?: string;      // templateId for all date columns
  string?: string;    // templateId for all string columns
  boolean?: string;   // templateId for all boolean columns
}

export interface ColumnTemplatesState {
  templates: Record<string, ColumnTemplate>;
  typeDefaults: TypeDefaults;
}

export const INITIAL_COLUMN_TEMPLATES: ColumnTemplatesState = {
  templates: {},
  typeDefaults: {},
};
