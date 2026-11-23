# Security Specification & Payload-First TDD — SIPEG SMP Negeri 1 Pacet

## 1. Data Invariants
1. **Identity Integrity**: Every `users/{userId}` document must have `uid == request.auth.uid` and cannot self-assign any `role` or `admin` privilege.
2. **Bootstrapped & Trusted RBAC**: Only verified users (`email_verified == true`) matching the bootstrapped admin email (`sangpujangga.malam88@gmail.com`) or existing in `/admins/{uid}` have administrative privileges.
3. **PII Isolation**: Sensitive personal fields (`nik`, `noHp`, `emailPribadi`, `alamat`, `kontakDarurat`) are strictly isolated in `/employees/{employeeId}/private/contact`, never stored in `/employees/{employeeId}`, and never queryable via `list`.
4. **Claim-Locking & Self-Edit Boundaries**: Unclaimed employee profiles (`ownerUid == ""`) may only be claimed once by setting `ownerUid` to `request.auth.uid`. Once claimed, non-admin owners can only update their personal profile fields and cannot alter `ownerUid`, `schoolCode`, `isVerifiedByAdmin`, or `createdAt`.
5. **Relational Attendance Integrity**: A non-admin user can only log attendance (`create`/`update`) for an existing `employees/{employeeId}` record where `ownerUid == request.auth.uid`.
6. **Temporal Integrity & Anti-Shadow-Write**: All `createdAt` and `updatedAt` fields must match `request.time`, and every write passes strict `keys().hasAll(...)` + `keys().hasOnly(...)` schema validation.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unverified Email Spoofing**: Admin email `sangpujangga.malam88@gmail.com` with `email_verified: false` attempting to list `/users` or write `/employees`.
2. **Self-Admin Privilege Escalation**: Standard employee attempting to create `/admins/{myUid}` with `role: 'admin'`.
3. **Shadow Field Injection on Employee Create**: Payload with all required `Employee` fields plus `isAdmin: true` or `shadowTag: 'x'`.
4. **ID Poisoning**: Creating `/employees/` with a 500-character ID or invalid characters (`../etc/passwd`).
5. **Owner Hijacking (Claim Theft)**: Authenticated user B attempting to overwrite `ownerUid` on an already-claimed employee profile owned by user A.
6. **Admin Verification Bypass**: Non-admin owner attempting to set `isVerifiedByAdmin: true` on their own employee profile.
7. **PII Blanket Read**: Employee B attempting `get` or `list` on `/employees/emp_A/private/contact`.
8. **Attendance Forgery**: Employee B attempting to create `/attendance/att_A_2026-11-22` referencing `employeeId: 'emp_A'` owned by Employee A.
9. **Timestamp Backdating**: Creating an employee or attendance document with client-forged `createdAt` (`2020-01-01T00:00:00Z`) instead of `request.time`.
10. **Immutable Field Mutation**: Updating `createdAt` or `schoolCode` on an existing `employees` or `attendance` document.
11. **Value Poisoning / Resource Exhaustion**: Setting `nama` or `alamat` to a 50,000-character string or passing wrong types (`masaKerjaTahun: "sepuluh"`).
12. **Orphaned Attendance Write**: Creating an attendance record pointing to a non-existent `employeeId: 'non_existent_id'`.
