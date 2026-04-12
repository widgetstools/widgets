export type ThemePreset = 'quartz' | 'alpine' | 'balham' | 'material';

export interface ThemeCustomParams {
  accentColor: string;
  backgroundColor: string;
  foregroundColor: string;
  borderColor: string;
  headerBackgroundColor: string;
  headerForegroundColor: string;
  rowHoverColor: string;
  selectedRowBackgroundColor: string;
  fontSize: number;
  headerFontSize: number;
  spacing: number;
}

export interface ThemingState {
  activeThemePreset: ThemePreset;
  customParams: ThemeCustomParams;
}

export const INITIAL_THEMING: ThemingState = {
  activeThemePreset: 'quartz',
  customParams: {
    accentColor: '#21B8A4',
    backgroundColor: '#ffffff',
    foregroundColor: '#181d1f',
    borderColor: '#e2e8f0',
    headerBackgroundColor: '#f8f8f8',
    headerForegroundColor: '#181d1f',
    rowHoverColor: 'rgba(33,184,164,0.08)',
    selectedRowBackgroundColor: 'rgba(33,184,164,0.12)',
    fontSize: 13,
    headerFontSize: 13,
    spacing: 8,
  },
};
