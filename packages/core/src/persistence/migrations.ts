import type { ProfileSnapshot } from '../types/profile';
import { CURRENT_SCHEMA_VERSION } from '../types/profile';

type MigrationFn = (snapshot: ProfileSnapshot) => ProfileSnapshot;

const migrations: Record<number, MigrationFn> = {
  // Future migrations go here:
  // 1: (snapshot) => { /* migrate from v1 to v2 */ return { ...snapshot, version: 2 }; },
};

export function migrateSnapshot(snapshot: ProfileSnapshot): ProfileSnapshot {
  let current = { ...snapshot };

  if (!current.version) {
    current.version = 1;
  }

  while (current.version < CURRENT_SCHEMA_VERSION) {
    const migrationFn = migrations[current.version];
    if (!migrationFn) {
      throw new Error(
        `No migration found for schema version ${current.version} → ${current.version + 1}`,
      );
    }
    current = migrationFn(current);
  }

  return current;
}
