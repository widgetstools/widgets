import type { GridCustomizerModule } from '../../types/module';
import { INITIAL_THEMING, type ThemingState } from './state';
import { ThemingPanel } from './ThemingPanel';

export const themingModule: GridCustomizerModule<ThemingState> = {
  id: 'theming',
  name: 'Theming',
  icon: 'Brush',
  priority: 5,

  getInitialState: () => ({
    activeThemePreset: INITIAL_THEMING.activeThemePreset,
    customParams: { ...INITIAL_THEMING.customParams },
  }),

  serialize: (state) => state,
  deserialize: (data) => {
    const raw = data as Partial<ThemingState>;
    return {
      activeThemePreset: raw.activeThemePreset ?? INITIAL_THEMING.activeThemePreset,
      customParams: {
        ...INITIAL_THEMING.customParams,
        ...(raw.customParams ?? {}),
      },
    };
  },

  SettingsPanel: ThemingPanel,
};

export type { ThemingState, ThemePreset, ThemeCustomParams } from './state';
