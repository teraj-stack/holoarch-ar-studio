# Firestore Security Specification — HoloArch AR Studio

## 1. Data Invariants
1. **Strict Ownership (`ownerId`)**: Every document in `/projects/{projectId}` belongs exclusively to `request.auth.uid` (`ownerId == request.auth.uid`).
2. **Verified Identity**: Only authenticated users with `request.auth.token.email_verified == true` may create, update, or delete `/projects/{projectId}` documents.
3. **Immutable Metadata**: `ownerId` and `createdAt` cannot be modified after creation (`incoming().ownerId == existing().ownerId && incoming().createdAt == existing().createdAt`).
4. **Temporal Integrity**: `createdAt` (on create) and `updatedAt` (on create/update) must strictly equal `request.time`.
5. **Bounded Strings & Strict Keys**: No shadow/ghost fields are allowed (`hasAll` + `hasOnly`). `name` is strictly bounded to `1..120` chars, `sceneId`, `framework`, and `palette` must match their enum allowlists, and `projectId` must match `^[a-zA-Z0-9_\-]+$` with length `<= 128`.
6. **Secure List Queries**: `allow list` enforces `resource.data.ownerId == request.auth.uid` on the server.

## 2. The "Dirty Dozen" Payloads
1. **Unauthenticated Create**: `auth = null` attempting to create `/projects/proj_1`.
2. **Unverified Email Create**: `auth.token.email_verified = false` attempting to create `/projects/proj_1`.
3. **Identity Spoofing on Create**: `ownerId = "victim_uid"` while `request.auth.uid = "attacker_uid"`.
4. **Shadow Field Injection on Create**: Payload includes `"isAdmin": true` not in `hasOnly` allowlist.
5. **Oversized Name DoS**: `name` length is 500 characters (`> 120`).
6. **Invalid Enum Value**: `sceneId = "malicious_scene"` not in `["skyline_financial", "eco_atrium", "aero_hub"]`.
7. **Forged Client Timestamp on Create**: `createdAt` is a client-chosen past timestamp instead of `request.time`.
8. **Ownership Hijack on Update**: Updating `ownerId` from `"user_a"` to `"user_b"`.
9. **Immortal Field Mutation on Update**: Updating `createdAt` during an `update` call.
10. **Ghost Field on Update**: Adding `"secretFlag": 1` during an `update` call (blocked by `affectedKeys().hasOnly(...)` and `isValidARProject`).
11. **Cross-Tenant Read (`get`/`list`)**: Authenticated user `"user_b"` attempting to read `"user_a"`'s project.
12. **ID Poisoning**: Document ID contains spaces/slashes or exceeds 128 characters.
