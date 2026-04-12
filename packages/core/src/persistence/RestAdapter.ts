import type { ProfileSnapshot, ProfileMeta } from '../types/profile';
import type { StorageAdapter } from './StorageAdapter';
import { migrateSnapshot } from './migrations';

export interface RestAdapterOptions {
  baseUrl: string;
  getHeaders?: () => Record<string, string>;
}

export class RestAdapter implements StorageAdapter {
  private baseUrl: string;
  private getHeaders: () => Record<string, string>;

  constructor(options: RestAdapterOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.getHeaders = options.getHeaders ?? (() => ({ 'Content-Type': 'application/json' }));
  }

  async save(profileId: string, snapshot: ProfileSnapshot): Promise<void> {
    await fetch(`${this.baseUrl}/profiles/${profileId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(snapshot),
    });
  }

  async load(profileId: string): Promise<ProfileSnapshot | null> {
    const res = await fetch(`${this.baseUrl}/profiles/${profileId}`, {
      headers: this.getHeaders(),
    });
    if (res.status === 404) return null;
    const data = await res.json();
    return migrateSnapshot(data);
  }

  async list(gridId?: string): Promise<ProfileMeta[]> {
    const url = gridId
      ? `${this.baseUrl}/profiles?gridId=${encodeURIComponent(gridId)}`
      : `${this.baseUrl}/profiles`;
    const res = await fetch(url, { headers: this.getHeaders() });
    return res.json();
  }

  async delete(profileId: string): Promise<void> {
    await fetch(`${this.baseUrl}/profiles/${profileId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
  }

  async getDefault(gridId: string): Promise<string | null> {
    const res = await fetch(
      `${this.baseUrl}/defaults/${encodeURIComponent(gridId)}`,
      { headers: this.getHeaders() },
    );
    if (res.status === 404) return null;
    const data = await res.json();
    return data.profileId ?? null;
  }

  async setDefault(gridId: string, profileId: string | null): Promise<void> {
    await fetch(`${this.baseUrl}/defaults/${encodeURIComponent(gridId)}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ profileId }),
    });
  }

  async exportJson(profileId: string): Promise<string> {
    const snapshot = await this.load(profileId);
    if (!snapshot) throw new Error(`Profile not found: ${profileId}`);
    return JSON.stringify(snapshot, null, 2);
  }

  async importJson(json: string): Promise<string> {
    const parsed = JSON.parse(json) as ProfileSnapshot;
    const migrated = migrateSnapshot(parsed);
    const res = await fetch(`${this.baseUrl}/profiles`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(migrated),
    });
    const data = await res.json();
    return data.id;
  }
}
