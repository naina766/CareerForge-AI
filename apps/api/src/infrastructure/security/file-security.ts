import path from 'path';
import { AppError } from '../../middleware/errorHandler.js';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.doc', '.docx']);
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export class FileSecurityValidator {
  /**
   * Sanitizes uploaded filename to prevent directory traversal and special character attacks.
   */
  static sanitizeFilename(originalName: string): string {
    if (!originalName) return 'resume.pdf';

    // Remove path traversal sequences
    const baseName = path.basename(originalName);

    // Strip null bytes and control characters
    const sanitized = baseName.replace(/[\x00-\x1F\x7F<>:"/\\|?*]/g, '_').trim();

    const ext = path.extname(sanitized).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new AppError(`Forbidden file extension "${ext}". Allowed: PDF, DOC, DOCX.`, 400, 'INVALID_FILE_TYPE');
    }

    return sanitized;
  }

  /**
   * Verifies file buffer magic bytes signature against allowed types.
   */
  static validateMagicBytes(buffer: Buffer, mimeType: string): void {
    if (!buffer || buffer.length < 4) {
      throw new AppError('Invalid or corrupted file content.', 400, 'INVALID_FILE_CONTENT');
    }

    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      throw new AppError('File size exceeds maximum allowed limit of 10MB.', 400, 'FILE_TOO_LARGE');
    }

    // PDF Magic Bytes: %PDF (0x25 0x50 0x44 0x46)
    const isPdf = buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;

    // DOCX / ZIP Magic Bytes: PK\x03\x04 (0x50 0x4B 0x03 0x04)
    const isDocx = buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;

    if (!isPdf && !isDocx) {
      throw new AppError('File signature does not match a valid PDF or DOCX document.', 400, 'MALICIOUS_FILE_SIGNATURE');
    }

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new AppError(`Unsupported MIME type: ${mimeType}`, 400, 'INVALID_MIME_TYPE');
    }
  }
}
