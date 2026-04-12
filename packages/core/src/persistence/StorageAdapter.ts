import type { ProfileSnapshot, ProfileMeta } from '../types/profile';

export interface StorageAdapter {
  save(profileId: string, snapshot: ProfileSnapshot): Promise<void>;
  load(profileId: string): Promise<ProfileSnapshot | null>;
  list(gridId?: string): Promise<ProfileMeta[]>;
  delete(profileId: string): Promise<void>;
  getDefault(gridId: string): Promise<string | null>;
  setDefault(gridId: string, profileId: string | null): Promise<void>;
  exportJson(profileId: string): Promise<string>;
  importJson(json: string): Promise<string>;
}
