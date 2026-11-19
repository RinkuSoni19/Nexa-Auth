# Security Specification — NexaAuth Firestore Rules

## 1. Data Invariants
1. **Default Deny**: All paths other than explicitly matched collections deny read and write.
2. **PII Isolation**: `/users/{userId}` contains user PII (`email`, `name`, `avatar`). Only the authenticated owner (`request.auth.uid == userId`) with a verified email (`request.auth.token.email_verified == true`) can `get`, `create`, `update`, or `delete` their own profile. `list` is strictly forbidden (`allow list: if false`) so no user can enumerate profiles.
3. **Identity & Path Hardening**: `userId` must satisfy `isValidId(userId)` (`^[a-zA-Z0-9_\-]+$`, `<= 128` chars), and `incoming().uid` must equal both `request.auth.uid` and `userId`.
4. **Immutable Fields**: `uid`, `authMethod`, and `createdAt` cannot change after creation.
5. **Temporal Integrity**: `createdAt` on create and `updatedAt` on both create and update must equal `request.time`.
6. **Strict Schema & Bounds**: No extra shadow keys; every string has explicit `.size()` bounds matching `firebase-blueprint.json`; `plan` and `authMethod` are constrained to explicit allowlists.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Unauthenticated read**: `GET /users/uid_1` with `auth = null`.
2. **Cross-user PII read**: `GET /users/uid_2` as `uid_1`.
3. **Collection scraping (list)**: `LIST /users` as any authenticated user.
4. **Unverified email write**: `CREATE /users/uid_1` with `email_verified = false`.
5. **Identity spoofing**: `CREATE /users/uid_1` with `uid: "uid_2"`.
6. **Cross-user create**: `CREATE /users/uid_2` as `uid_1`.
7. **Shadow field injection**: `CREATE /users/uid_1` with extra key `isAdmin: true`.
8. **Oversized string poisoning**: `CREATE /users/uid_1` with `name` of 500 characters (`> 100`).
9. **Client-forged timestamp**: `CREATE /users/uid_1` with client timestamp != `request.time`.
10. **Immutable field tampering**: `UPDATE /users/uid_1` changing `createdAt` or `uid`.
11. **Invalid enum poisoning**: `UPDATE /users/uid_1` setting `plan: "unlimited-free"`.
12. **Unknown collection write**: `CREATE /vaults/v1` (caught by default-deny catch-all).
