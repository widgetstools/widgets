import Dexie from 'dexie';
import type { ProfileSnapshot, ProfileMeta } from '../types/profile';
import type { StorageAdapter } from './StorageAdapter';
import { migrateSnapshot } from './migrations';

interface ProfileRecord extends ProfileSnapshot {
  id: string;
}

interface DefaultRecord {
  gridId: string;
  profileId: string;
}

class GridCustomizerDB extends Dexie {
  profiles!: Dexie.Table<ProfileRecord, string>;
  defaults!: Dexie.Table<DefaultRecord, string>;

  constructor() {
    super('GridCustomizerDB');
    this.version(1).stores({
      profiles: 'id, gridId, name, updatedAt',
      defaults: 'gridId',
    });
  }
}

export class DexieAdapter implements StorageAdapter {
  private db: GridCustomizerDB;

  constructor() {
    this.db = new GridCustomizerDB();
  }

  async save(profileId: string, snapshot: ProfileSnapshot): Promise<void> {
    await this.db.profiles.put({ ...snapshot, id: profileId });
  }

  async load(profileId: string): Promise<ProfileSnapshot | null> {
    const record = await this.db.profiles.get(profileId);
    if (!record) return null;
    return migrateSnapshot(record);
  }

  async list(gridId?: string): Promise<ProfileMeta[]> {
    let collection = this.db.profiles.orderBy('updatedAt').reverse();
    if (gridId) {
      collection = this.db.profiles.where('gridId').equals(gridId).reverse();
    }
    const records = await collection.toArray();
    const defaults = await this.db.defaults.toArray();
    const defaultMap = new Map(defaults.map((d) => [d.gridId, d.profileId]));

    return records.map((r) => ({
      id: r.id,
      gridId: r.gridId,
      name: r.name,
      description: r.description,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      isDefault: defaultMap.get(r.gridId) === r.id,
    }));
  }

  async delete(profileId: string): Promise<void> {
    await this.db.profiles.delete(profileId);
  }

  async getDefault(gridId: string): Promise<string | null> {
    const record = await this.db.defaults.get(gridId);
    return record?.profileId ?? null;
  }

  async setDefault(gridId: string, profileId: string | null): Promise<void> {
    if (profileId === null) {
      await this.db.defaults.delete(gridId);
    } else {
      await this.db.defaults.put({ gridId, profileId });
    }
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
}
