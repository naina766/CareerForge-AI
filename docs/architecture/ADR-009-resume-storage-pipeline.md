# ADR-009: Secure Resume Ingestion, Storage Abstraction, and Multi-Layer Validation

## Status
Accepted

## Context
In CareerForge AI, candidates upload resume documents in PDF format. This ingestion pipeline is critical as it handles untrusted external user input (arbitrary binary uploads) while acting as the initial data gateway for downstream resume parsing, ATS scoring, embedding generation, and LLM career matching.

Key architectural requirements:
1. **Provider-Agnostic Storage**: Decouple the application from proprietary cloud storage providers (S3, GCS, Cloudflare R2) by utilizing a clean `IStorageProvider` interface with a local filesystem implementation for free, zero-dependency development.
2. **Multi-Layer File Security & Magic Bytes**: Reject file tampering by inspecting file extension (`.pdf`), MIME header (`application/pdf`), and actual binary file signatures (Magic Bytes `%PDF-` / `0x25, 0x50, 0x44, 0x46, 0x2D`).
3. **Malicious Filename Sanitization & Path Traversal**: Prevent arbitrary filesystem overwrites or directory traversal attacks (`../../`) by sanitizing filenames and storing files using cryptographically isolated storage keys (`resumes/{candidateId}/{uuid}.pdf`).
4. **Strict IDOR & Non-Public Exposure**: Resume files must never be served statically through open `/uploads` directories. Downloads are authenticated and scoped strictly to `req.user.id`.
5. **Storage / Database Consistency Rollback**: If a database record creation fails following a storage upload, the orphaned file is rolled back and removed immediately.
6. **Preparation for Phase 6**: Mark newly ingested resumes with status `READY_FOR_PROCESSING` for downstream consumption by resume parsing workers.

## Decision

### 1. Storage Provider Abstraction
```text
IStorageProvider
  ├── upload(key, buffer, mimeType)
  ├── delete(key)
  ├── getStream(key)
  ├── getBuffer(key)
  └── exists(key)

Implementations:
- LocalStorageProvider (Development: ./storage/uploads/resumes/)
- S3StorageProvider / R2StorageProvider (Production: Provider-agnostic object storage)
```

### 2. Multi-Layer Ingestion Flow
```text
Client (Multipart/form-data)
  ↓
Express Multer (In-memory buffer)
  ↓
ResumeValidator
  ├── 1. File Size Validation (<= MAX_RESUME_SIZE_MB = 5MB)
  ├── 2. Extension Check (.pdf)
  ├── 3. MIME Type Check (application/pdf)
  ├── 4. Magic-Byte Header Check (%PDF-)
  ├── 5. Malware Scanner Abstraction (MockVirusScanner)
  └── 6. SHA-256 Checksum Calculation
  ↓
Storage Provider (Write to private storage key: resumes/{candidateId}/{uuid}.pdf)
  ↓
PostgreSQL / Prisma Resume Record (Status: READY_FOR_PROCESSING, version: N)
  ↓
AuditLog Trail (RESUME_UPLOADED)
```

### 3. Resume Replacement & Versioning
When a candidate uploads a new resume:
1. The previous storage file is deleted from the storage provider.
2. The previous active resume record is marked `isActive: false` or updated.
3. The new resume is stored with an incremented `version` and status `READY_FOR_PROCESSING`.

### 4. Downstream Phase 6 Hand-Off
- Phase 5 **does not** parse text or run OCR.
- Phase 5 securely ingests the file and establishes the `READY_FOR_PROCESSING` state in PostgreSQL.
- Phase 6 (Resume Parsing) and Phase 17/18 (Kafka events / workers) will consume this state to extract structured resume text, skills, and work history.

## Consequences
### Positive
- Zero cloud cost for local developers while maintaining enterprise cloud-readiness.
- Robust defense-in-depth against malicious file uploads and path traversal.
- Clean isolation between candidate tenants with strict IDOR prevention.
- Seamless interface for downstream AI and parsing workers.
