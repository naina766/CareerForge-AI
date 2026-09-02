# Security Hardening & OWASP API Compliance

## 1. Cryptographic Security & Secrets
- All JWT secrets must be at least 256 bits (32 characters).
- Secrets and tokens are redacted (`[REDACTED]`) before logging.
- Passwords are encrypted using Argon2 / BCrypt with salted work factors.

## 2. Distributed Rate Limiting & DoS Protection
- **Authentication**: 20 requests / 15 minutes
- **Career Assistant**: 40 requests / minute
- **Recommendations**: 60 requests / minute
- **Resume Uploads**: 15 requests / 10 minutes
- **General API**: 500 requests / 15 minutes

## 3. Resume File Upload Security
- **MIME Type Whitelist**: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- **File Signature / Magic Bytes**: Enforced `%PDF-` and `PK\x03\x04` validation
- **Path Traversal Protection**: Stripping directory navigation sequences (`../`)
- **Max File Size**: 10 MB ceiling

## 4. Tenant Isolation & IDOR Protection
- Candidates can only query, mutate, or download their own profile, resumes, applications, and recommendations.
- Recruiters can only modify jobs and view applications for their designated company tenant.
