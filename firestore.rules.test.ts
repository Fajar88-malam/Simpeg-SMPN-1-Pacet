/**
 * Security Rules Specification Verification Suite (Dirty Dozen Test Matrix)
 * Documents expected PERMISSION_DENIED outcomes for adversarial payloads.
 */
export interface AdversarialTestCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: { uid: string; email: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedOutcome: 'PERMISSION_DENIED';
}

export const dirtyDozenPayloads: AdversarialTestCase[] = [
  {
    id: 1,
    name: 'Unverified Email Admin Spoof',
    collectionPath: 'users',
    operation: 'list',
    auth: { uid: 'spoof-uid', email: 'sangpujangga.malam88@gmail.com', email_verified: false },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Self-Admin Privilege Escalation',
    collectionPath: 'admins/attacker-uid',
    operation: 'create',
    auth: { uid: 'attacker-uid', email: 'pegawai@smpn1pacet.sch.id', email_verified: true },
    payload: { uid: 'attacker-uid', email: 'pegawai@smpn1pacet.sch.id', name: 'Attacker', role: 'admin' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Shadow Field Injection on Employee Create',
    collectionPath: 'employees/emp_shadow',
    operation: 'create',
    auth: { uid: 'user-1', email: 'user1@smpn1pacet.sch.id', email_verified: true },
    payload: { ownerUid: 'user-1', schoolCode: 'SMPN1PACET', nama: 'Test', shadowFlag: true },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Path Variable ID Poisoning',
    collectionPath: 'employees/bad..id$invalid',
    operation: 'create',
    auth: { uid: 'user-1', email: 'user1@smpn1pacet.sch.id', email_verified: true },
    payload: { id: 'bad..id$invalid', ownerUid: 'user-1' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Claim Hijacking on Owned Employee',
    collectionPath: 'employees/emp_001',
    operation: 'update',
    auth: { uid: 'user-b', email: 'userb@smpn1pacet.sch.id', email_verified: true },
    payload: { ownerUid: 'user-b' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Non-Admin Self-Verification Bypass',
    collectionPath: 'employees/emp_user1',
    operation: 'update',
    auth: { uid: 'user-1', email: 'user1@smpn1pacet.sch.id', email_verified: true },
    payload: { isVerifiedByAdmin: true },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'PII Cross-User Read Attempt',
    collectionPath: 'employees/emp_001/private/contact',
    operation: 'get',
    auth: { uid: 'user-b', email: 'userb@smpn1pacet.sch.id', email_verified: true },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Attendance Forgery for Another Employee',
    collectionPath: 'attendance/emp_001_2026-11-22',
    operation: 'create',
    auth: { uid: 'user-b', email: 'userb@smpn1pacet.sch.id', email_verified: true },
    payload: { employeeId: 'emp_001', ownerUid: 'user-b', status: 'Hadir' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Client-Forged Backdated Timestamp',
    collectionPath: 'employees/emp_user1',
    operation: 'create',
    auth: { uid: 'user-1', email: 'user1@smpn1pacet.sch.id', email_verified: true },
    payload: { ownerUid: 'user-1', createdAt: '2020-01-01T00:00:00.000Z' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Immutable SchoolCode Mutation',
    collectionPath: 'employees/emp_user1',
    operation: 'update',
    auth: { uid: 'user-1', email: 'user1@smpn1pacet.sch.id', email_verified: true },
    payload: { schoolCode: 'OTHER_SCHOOL' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Value Poisoning Oversized String & Type Mismatch',
    collectionPath: 'employees/emp_user1/private/contact',
    operation: 'update',
    auth: { uid: 'user-1', email: 'user1@smpn1pacet.sch.id', email_verified: true },
    payload: { alamat: 'A'.repeat(2000), nik: 12345 },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Orphaned Attendance Record',
    collectionPath: 'attendance/ghost_2026-11-22',
    operation: 'create',
    auth: { uid: 'user-1', email: 'user1@smpn1pacet.sch.id', email_verified: true },
    payload: { employeeId: 'non_existent_emp', ownerUid: 'user-1', status: 'Hadir' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
];
