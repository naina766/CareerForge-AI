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
  private baseDirRelPath: string;

  constructor(baseDir: string = './storage/uploads/resumes') {
    this.baseDirRelPath = baseDir;
    this.baseDir = path.isAbsolute(baseDir)
      ? baseDir
      : path.resolve(process.cwd(), baseDir);
  }

  private resolveSafePath(key: string): string {
    if (!key || typeof key !== 'string' || !key.trim()) {
      throw new AppError('Invalid storage key: key cannot be empty', 400, 'INVALID_STORAGE_KEY');
    }

    if (key.includes('\0')) {
      throw new AppError('Invalid storage key: null bytes prohibited', 400, 'INVALID_STORAGE_KEY');
    }

    // Strip leading slashes/backslashes and normalize
    const cleanKey = key.replace(/^[/\\]+/, '');
    const normalizedKey = path.normalize(cleanKey);
    const fullPath = path.resolve(this.baseDir, normalizedKey);

    // Ensure target path is strictly within baseDir and not baseDir itself
    const relative = path.relative(this.baseDir, fullPath);
    if (!relative || relative === '.' || relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new AppError('Invalid storage key: directory traversal prohibited', 400, 'INVALID_STORAGE_KEY');
    }

    // Monorepo cross-directory fallback check for dev/test workspace alignment
    if (!existsSync(fullPath)) {
      const workspaceFallback = path.resolve(process.cwd(), '../../', this.baseDirRelPath, normalizedKey);
      if (existsSync(workspaceFallback)) {
        return workspaceFallback;
      }
      const appFallback = path.resolve(process.cwd(), 'apps/api', this.baseDirRelPath, normalizedKey);
      if (existsSync(appFallback)) {
        return appFallback;
      }
    }

    return fullPath;
  }

  private async getVerifiedFilePath(key: string): Promise<string> {
    const fullPath = this.resolveSafePath(key);

    let stat;
    try {
      stat = await fs.stat(fullPath);
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        throw new AppError('File not found in storage', 404, 'RESUME_NOT_FOUND');
      }
      throw err;
    }

    // Critical EISDIR defense: Reject directories attempting to be streamed/read as files
    if (!stat.isFile()) {
      throw new AppError('Requested storage path is a directory, not a file', 400, 'INVALID_STORAGE_KEY');
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
    try {
      const fullPath = this.resolveSafePath(key);
      const stat = await fs.stat(fullPath).catch(() => null);
      if (stat && stat.isFile()) {
        await fs.unlink(fullPath);
        logger.debug(`File deleted locally: ${fullPath}`);
      }
    } catch (err) {
      logger.warn(`Failed to delete local file for key ${key}:`, err);
    }
  }

  async getStream(key: string): Promise<Readable> {
    const fullPath = await this.getVerifiedFilePath(key);
    return createReadStream(fullPath);
  }

  async getBuffer(key: string): Promise<Buffer> {
    const fullPath = await this.getVerifiedFilePath(key);
    return fs.readFile(fullPath);
  }

  async exists(key: string): Promise<boolean> {
    try {
      const fullPath = await this.getVerifiedFilePath(key);
      return !!fullPath;
    } catch {
      return false;
    }
  }
}
