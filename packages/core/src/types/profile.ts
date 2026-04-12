export interface ProfileSnapshot {
  version: number;
  gridId: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  agGridState: unknown;
  modules: Record<string, unknown>;
}

export interface ProfileMeta {
  id: string;
  gridId: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  isDefault: boolean;
}

export const CURRENT_SCHEMA_VERSION = 1;
