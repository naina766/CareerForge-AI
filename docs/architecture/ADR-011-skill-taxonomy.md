# ADR-011: Skill Taxonomy & Normalization Engine

## Status
Accepted

## Context
In modern technical recruitment and automated ATS workflows, candidates and job descriptions describe identical technical competencies using countless spelling and formatting variations (e.g. `JS`, `JavaScript`, `Javascript`, `ECMAScript`; `NodeJS`, `Node`, `Node.js`; `Postgres`, `PostgreSQL`, `PostgresDB`).

Comparing raw strings or depending solely on non-deterministic LLM output introduces inconsistency, hallucination risks, and high API costs into downstream matching engines.

Key architectural requirements:
1. **Deterministic Normalization**: Given the same input string, the engine must always return the exact same canonical skill ID without calling external LLM APIs.
2. **Relational Database-Backed Taxonomy**:
   - `Skill`: Stores canonical name, URL-friendly unique `slug`, `category`, and active status.
   - `SkillAlias`: Maps variations and abbreviations (`normalizedAlias`) to a single canonical `skillId`.
3. **Multi-Stage Resolution Pipeline**:
   1. **Canonical Match**: Exact case-insensitive match on canonical `name` or `slug`.
   2. **Alias Resolution**: Lookup on `SkillAlias.normalizedAlias`.
   3. **Conservative Fuzzy Match**: Levenshtein distance metrics (threshold $\ge 0.85$, length diff $\le 2$) strictly guarding distinct languages/frameworks (e.g. `Java` $\neq$ `JavaScript`, `React` $\neq$ `React Native`, `C` $\neq$ `C++` $\neq$ `C#`).
   4. **Unresolved Fallback**: Never force or hallucinate a canonical skill for unknown inputs.
4. **Data Provenance & Ownership**:
   - `CandidateSkill` links the candidate to canonical `Skill` and stores `source` (`PROFILE`, `RESUME`, `MANUAL`, `SYSTEM`).
   - Only `ADMIN` role users can modify the taxonomy (`POST /api/v1/admin/skills`, `POST /api/v1/admin/skills/:id/aliases`).
5. **Downstream Matching Contract**: Downstream algorithms (Phase 8 vector embeddings, Phase 9 ATS scoring, Phase 13 hybrid matching) compare stable canonical `Skill.id` values instead of raw text.

## Decision

### 1. Database Schema
```prisma
model Skill {
  id          String        @id @default(uuid())
  name        String        @unique
  slug        String        @unique
  category    SkillCategory @default(OTHER)
  description String?
  isActive    Boolean       @default(true)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  aliases         SkillAlias[]
  resumeSkills    ResumeSkill[]
  jobSkills       JobSkill[]
  candidateSkills CandidateSkill[]

  @@index([name])
  @@index([slug])
  @@index([category])
  @@index([isActive])
}

model SkillAlias {
  id              String   @id @default(uuid())
  skillId         String
  alias           String
  normalizedAlias String   @unique
  createdAt       DateTime @default(now())

  skill Skill @relation(fields: [skillId], references: [id], onDelete: Cascade)

  @@index([skillId])
  @@index([normalizedAlias])
}
```

### 2. Resolution Response Contract
```json
{
  "input": "ReactJS",
  "canonicalSkillId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "canonicalName": "React",
  "slug": "react",
  "category": "FRONTEND",
  "matchType": "ALIAS",
  "confidence": 1.0
}
```

### 3. API Surface
- `GET /api/v1/skills`: Search canonical skills with query, category, and pagination.
- `POST /api/v1/skills/resolve`: Batch resolve raw skill strings into deduplicated canonical entities.
- `GET /api/v1/skills/:skillId`: Canonical skill details.
- `POST /api/v1/admin/skills`: Admin create canonical skill.
- `PATCH /api/v1/admin/skills/:skillId`: Admin update/deactivate skill.
- `POST /api/v1/admin/skills/:skillId/aliases`: Admin add alias mapping.
- `DELETE /api/v1/admin/skill-aliases/:aliasId`: Admin delete alias mapping.

## Consequences
### Positive
- Fully deterministic, explainable, and zero API cost.
- Robust defense against accidental cross-language collisions (`Java` vs `JavaScript`).
- Downstream Phase 8 embeddings, Phase 9 ATS, and Phase 13 matching can operate on canonical IDs.
