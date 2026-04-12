import type { ProfileSnapshot, ProfileMeta } from '../types/profile';
import type { StorageAdapter } from './StorageAdapter';
import { migrateSnapshot } from './migrations';

const PREFIX = 'gc-profile:';
const DEFAULTS_KEY = 'gc-defaults';

export class LocalStorageAdapter implements StorageAdapter {
  async save(profileId: string, snapshot: ProfileSnapshot): Promise<void> {
    localStorage.setItem(PREFIX + profileId, JSON.stringify(snapshot));
  }

  async load(profileId: string): Promise<ProfileSnapshot | null> {
    const raw = localStorage.getItem(PREFIX + profileId);
    if (!raw) return null;
    return migrateSnapshot(JSON.parse(raw));
  }

  async list(gridId?: string): Promise<ProfileMeta[]> {
    const defaults = this.getDefaultsMap();
    const results: ProfileMeta[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(PREFIX)) continue;
      const profileId = key.slice(PREFIX.length);
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const snapshot: ProfileSnapshot = JSON.parse(raw);
      if (gridId && snapshot.gridId !== gridId) continue;

      results.push({
        id: profileId,
        gridId: snapshot.gridId,
        name: snapshot.name,
        description: snapshot.description,
        createdAt: snapshot.createdAt,
        updatedAt: snapshot.updatedAt,
        isDefault: defaults[snapshot.gridId] === profileId,
      });
    }

    return results.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async delete(profileId: string): Promise<void> {
    localStorage.removeItem(PREFIX + profileId);
  }

  async getDefault(gridId: string): Promise<string | null> {
    return this.getDefaultsMap()[gridId] ?? null;
  }

  async setDefault(gridId: string, profileId: string | null): Promise<void> {
    const defaults = this.getDefaultsMap();
    if (profileId === null) {
      delete defaults[gridId];
    } else {
      defaults[gridId] = profileId;
    }
    localStorage.setItem(DEFAULTS_KEY, JSON.stringify(defaults));
  }

  async exportJson(profileId: string): Promise<string> {
    const snapshot = await this.load(profileId);
    if (!snapshot) throw new Error(`Profile not found: ${profileId}`);
    return JSON.stringify(snapshot, null, 2);
  }

  async importJson(json: string): Promise<string> {
    const parsed = JSON.parse(json) as ProfileSnapshot;
    const migrated = migrateSnapshot(parsed);
    const profileId = `imported-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await this.save(profileId, migrated);
    return profileId;
  }

  private getDefaultsMap(): Record<string, string> {
    const raw = localStorage.getItem(DEFAULTS_KEY);
    return raw ? JSON.parse(raw) : {};
  }
}
