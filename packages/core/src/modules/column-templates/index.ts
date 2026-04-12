import type { GridCustomizerModule } from '../../types/module';
import { INITIAL_COLUMN_TEMPLATES, type ColumnTemplatesState } from './state';
import { ColumnTemplatesPanel } from './ColumnTemplatesPanel';

export const columnTemplatesModule: GridCustomizerModule<ColumnTemplatesState> = {
  id: 'column-templates',
  name: 'Templates',
  icon: 'Copy',   // uses Copy icon from icons.tsx
  priority: 8,    // between Theming (5) and Column Customization (10)

  getInitialState: () => ({ ...INITIAL_COLUMN_TEMPLATES }),

  // Templates don't transform defs directly — column-customization reads
  // templates from this module's state via getModuleState('column-templates')

  serialize: (state) => state,
  deserialize: (data) => ({
    ...INITIAL_COLUMN_TEMPLATES,
    ...(data as Partial<ColumnTemplatesState>),
  }),

  SettingsPanel: ColumnTemplatesPanel,
};

export type { ColumnTemplatesState } from './state';
