/// <reference types="node" />
import fs from 'fs/promises';
import { createReadStream, existsSync } from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { IStorageProvider, StorageUploadResult } from './storage.interface.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

export class LocalStorageProvider implements IStorageProvider {
  private baseDir: string;

  constructor(baseDir: string = './storage/uploads/resumes') {
    this.baseDir = path.resolve(process.cwd(), baseDir);
  }

  private resolveSafePath(key: string): string {
    // Sanitize and prevent path traversal
    const normalizedKey = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, '');
    const fullPath = path.resolve(this.baseDir, normalizedKey);

    if (!fullPath.startsWith(this.baseDir)) {
      throw new AppError('Invalid storage key: directory traversal prohibited', 400, 'INVALID_STORAGE_KEY');
    }

    return fullPath;
  }

  async upload(key: string, buffer: Buffer, _mimeType: string): Promise<StorageUploadResult> {
    const fullPath = this.resolveSafePath(key);
    const parentDir = path.dirname(fullPath);

    await fs.mkdir(parentDir, { recursive: true });
    await fs.writeFile(fullPath, buffer);

    logger.debug(`File stored locally: ${fullPath} (${buffer.length} bytes)`);

    return {
      key,
      url: `/api/v1/candidates/me/resume/download`,
      size: buffer.length,
    };
  }

  async delete(key: string): Promise<void> {
    const fullPath = this.resolveSafePath(key);
    try {
      if (existsSync(fullPath)) {
        await fs.unlink(fullPath);
        logger.debug(`File deleted locally: ${fullPath}`);
      }
    } catch (err) {
      logger.warn(`Failed to delete local file ${fullPath}:`, err);
    }
  }

  async getStream(key: string): Promise<Readable> {
    const fullPath = this.resolveSafePath(key);
    if (!existsSync(fullPath)) {
      throw new AppError('File not found in storage', 404, 'RESUME_NOT_FOUND');
    }
    return createReadStream(fullPath);
  }

  async getBuffer(key: string): Promise<Buffer> {
    const fullPath = this.resolveSafePath(key);
    if (!existsSync(fullPath)) {
      throw new AppError('File not found in storage', 404, 'RESUME_NOT_FOUND');
    }
    return fs.readFile(fullPath);
  }

  async exists(key: string): Promise<boolean> {
    const fullPath = this.resolveSafePath(key);
    return existsSync(fullPath);
  }
}
