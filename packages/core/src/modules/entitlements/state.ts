export interface EntitlementRule {
  id: string;
  name: string;
  enabled: boolean;
  columnId: string;
  type: 'row-value' | 'role-based' | 'rest';
  /** Expression evaluated against row data (for type 'row-value') */
  expression: string;
  /** Allowed roles (for type 'role-based') */
  roles: string[];
  /** REST endpoint URL (for type 'rest') */
  endpoint: string;
  /** Cache TTL in seconds (for type 'rest') */
  cacheTtl: number;
  fallback: 'allow' | 'deny';
}

export interface EntitlementsState {
  rules: EntitlementRule[];
}

export const INITIAL_ENTITLEMENTS: EntitlementsState = {
  rules: [],
};
