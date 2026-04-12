export interface FlashRule {
  id: string;
  name: string;
  enabled: boolean;
  columns: string[]; // target column IDs, empty = all columns
  condition?: string; // expression for conditional flash (e.g., 'value > oldValue')
  flashDuration: number; // ms, default 500
  fadeDuration: number; // ms, default 1000
  upColor: { light: string; dark: string }; // green tones
  downColor: { light: string; dark: string }; // red tones
  neutralColor: { light: string; dark: string }; // for non-directional
  scope: 'cell' | 'row';
}

export interface CellFlashingState {
  rules: FlashRule[];
  globalFlashDuration: number;
  globalFadeDuration: number;
  enableChangeDetection: boolean;
}

export const INITIAL_CELL_FLASHING: CellFlashingState = {
  rules: [],
  globalFlashDuration: 500,
  globalFadeDuration: 1000,
  enableChangeDetection: true,
};
