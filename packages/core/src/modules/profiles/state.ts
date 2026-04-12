import type { ProfileMeta } from '../../types/profile';

export interface ProfilesState {
  profiles: ProfileMeta[];
  activeProfileId: string | null;
  defaultProfileId: string | null;
}

export const INITIAL_PROFILES: ProfilesState = {
  profiles: [],
  activeProfileId: null,
  defaultProfileId: null,
};
