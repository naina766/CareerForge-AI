/// <reference types="node" />
import crypto from 'crypto';
import path from 'path';
import { AppError } from '../../middleware/errorHandler.js';
import { env } from '@careerforge/config';
import { IVirusScanner, defaultVirusScanner } from '../../storage/index.js';

export interface ValidatedResumeFile {
  originalFileName: string;
  sanitizedFileName: string;
  mimeType: string;
  fileSize: number;
  checksum: string;
  buffer: Buffer;
}

/**
 * PDF Magic Bytes signature: %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
 */
const PDF_MAGIC_BYTES = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]);

export class ResumeValidator {
  /**
   * Performs multi-layer validation on an uploaded resume file:
   * 1. File existence
   * 2. Size limit (configured via MAX_RESUME_SIZE_MB)
   * 3. Extension check (.pdf)
   * 4. MIME type check (application/pdf)
   * 5. Magic bytes inspection (%PDF-)
   * 6. Virus / Malware scanning abstraction
   * 7. SHA-256 checksum calculation
   */
  static async validate(
    file?: Express.Multer.File,
    virusScanner: IVirusScanner = defaultVirusScanner
  ): Promise<ValidatedResumeFile> {
    if (!file || !file.buffer) {
      throw new AppError('Resume file is required (multipart field: resume or file)', 400, 'RESUME_REQUIRED');
    }

    const maxSizeBytes = env.MAX_RESUME_SIZE_MB * 1024 * 1024;
    if (file.buffer.length > maxSizeBytes) {
      throw new AppError(
        `File exceeds maximum permitted size of ${env.MAX_RESUME_SIZE_MB} MB. (Provided: ${(file.buffer.length / (1024 * 1024)).toFixed(2)} MB)`,
        400,
        'FILE_TOO_LARGE'
      );
    }

    // 1. Extension validation
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.pdf') {
      throw new AppError('Only PDF resume files (.pdf) are supported in CareerForge AI', 400, 'INVALID_FILE_TYPE');
    }

    // 2. MIME type validation
    if (file.mimetype !== 'application/pdf' && file.mimetype !== 'application/x-pdf') {
      throw new AppError('Invalid MIME type. Expected application/pdf', 400, 'INVALID_MIME_TYPE');
    }

    // 3. Magic Bytes verification (defense against renamed malicious binaries)
    if (file.buffer.length < 5) {
      throw new AppError('Malformed or corrupt file', 400, 'INVALID_FILE_SIGNATURE');
    }

    const fileHeader = file.buffer.subarray(0, 5);
    if (!fileHeader.equals(PDF_MAGIC_BYTES)) {
      throw new AppError(
        'Invalid file signature. The file content is not a valid PDF document (missing %PDF- header)',
        400,
        'INVALID_FILE_SIGNATURE'
      );
    }

    // 4. Virus & Threat Scanner Abstraction
    const scanResult = await virusScanner.scan(file.buffer);
    if (!scanResult.isClean) {
      throw new AppError(
        `File rejected by security scanner: ${scanResult.threat || 'Threat detected'}`,
        400,
        'VIRUS_DETECTED'
      );
    }

    // 5. Filename Sanitization
    const sanitizedFileName = path
      .basename(file.originalname)
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 150);

    // 6. SHA-256 Checksum calculation
    const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');

    return {
      originalFileName: file.originalname.slice(0, 150),
      sanitizedFileName,
      mimeType: 'application/pdf',
      fileSize: file.buffer.length,
      checksum,
      buffer: file.buffer,
    };
  }
}
