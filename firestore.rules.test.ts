/**
 * Firestore Security Rules Verification Suite (Dirty Dozen Payloads)
 */
export const DIRTY_DOZEN_TEST_CASES = [
  { id: 1, name: 'Unauthenticated Create', expected: 'PERMISSION_DENIED' },
  { id: 2, name: 'Unverified Email Create', expected: 'PERMISSION_DENIED' },
  { id: 3, name: 'Identity Spoofing on Create', expected: 'PERMISSION_DENIED' },
  { id: 4, name: 'Shadow Field Injection on Create', expected: 'PERMISSION_DENIED' },
  { id: 5, name: 'Oversized Name DoS (>120 chars)', expected: 'PERMISSION_DENIED' },
  { id: 6, name: 'Invalid Enum Value on sceneId', expected: 'PERMISSION_DENIED' },
  { id: 7, name: 'Forged Client Timestamp on Create', expected: 'PERMISSION_DENIED' },
  { id: 8, name: 'Ownership Hijack on Update', expected: 'PERMISSION_DENIED' },
  { id: 9, name: 'Immortal Field (createdAt) Mutation on Update', expected: 'PERMISSION_DENIED' },
  { id: 10, name: 'Ghost Field on Update', expected: 'PERMISSION_DENIED' },
  { id: 11, name: 'Cross-Tenant Read/List', expected: 'PERMISSION_DENIED' },
  { id: 12, name: 'Document ID Poisoning (>128 chars)', expected: 'PERMISSION_DENIED' },
] as const;
