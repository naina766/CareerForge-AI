# ADR-007: Short-Lived JWT, Rotated Hashed Refresh Tokens & Role-Based Access Control

## Status
Accepted

## Context
CareerForge AI is a multi-persona career intelligence platform serving **Candidates**, **Recruiters**, and **Administrators**. We required an authentication and authorization architecture that prevents account enumeration, protects against token theft, supports single-session and all-device logout, and guarantees role-based boundaries.

Alternative approaches considered:
1. Long-lived JWT access tokens stored in `localStorage`.
2. Stateful server-side sessions stored only in memory.
3. Hybrid short-lived Access JWT (in-memory) + Database-backed Rotated Refresh Tokens in secure HTTP-only cookies.

## Decision
We adopted the **Hybrid Short-Lived Access JWT + Rotated Refresh Token** model:

### 1. Dual-Token Architecture
- **Access JWT**: Short-lived (15 minutes), signed with `HS256`, containing minimal claims (`sub`, `email`, `role`). Handled strictly in-memory by client applications.
- **Refresh Token**: Cryptographically random 40-byte string transmitted via a `SameSite=Lax`, `HttpOnly`, `Secure` cookie scoped to `/api/v1/auth`. Stored in PostgreSQL as a SHA-256 hash (`tokenHash`).

### 2. Refresh Token Rotation & Reuse Detection
- Upon every `/api/v1/auth/refresh` request, the presented refresh token is revoked and immediately replaced with a newly generated token (`replacedByTokenId`).
- **Reuse Detection**: If a client presents an already-revoked refresh token (indicating token theft or interception), the system detects reuse, invalidates the entire token family for that user, and emits a `REFRESH_TOKEN_REUSED` security audit event.

### 3. Role-Based Access Control (RBAC)
- Roles: `CANDIDATE`, `RECRUITER`, `ADMIN`.
- Public self-registration is strictly restricted to `CANDIDATE` and `RECRUITER`. Public attempts to register with role `ADMIN` are rejected with `403 Forbidden`.
- Route-level middleware (`requireAuth`, `requireRole('CANDIDATE' | 'RECRUITER' | 'ADMIN')`) enforces authorization boundaries at the API layer. Frontend role checks are utilized solely for UX rendering.

### 4. Password Security & Anti-Enumeration
- Passwords hashed using `bcrypt` with cost factor 12.
- Login failures return a generic `"Invalid email or password"` error with constant-time computation to mitigate user enumeration and timing attacks.
- `passwordHash` is stripped and never returned in API payloads or serialized logs.

## Consequences
### Positive
- Minimizes blast radius of stolen access tokens (15-minute lifespan).
- Storing only SHA-256 token hashes prevents database compromise from leaking usable session tokens.
- Immediate detection and mitigation of compromised refresh tokens.
- Strict isolation of Candidate, Recruiter, and Admin capabilities.

### Trade-offs
- Frontend client must manage in-memory tokens and execute silent background refresh requests via HTTP-only cookies.
