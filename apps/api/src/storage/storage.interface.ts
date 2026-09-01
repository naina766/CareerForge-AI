/// <reference types="node" />
import { Readable } from 'stream';

export interface StorageUploadResult {
  key: string;
  url: string;
  size: number;
}

export interface IStorageProvider {
  /**
   * Uploads a file buffer to storage using the designated key.
   */
  upload(key: string, buffer: Buffer, mimeType: string): Promise<StorageUploadResult>;

  /**
   * Deletes a stored file by key.
   */
  delete(key: string): Promise<void>;

  /**
   * Returns a readable stream for authenticated file downloads.
   */
  getStream(key: string): Promise<Readable>;

  /**
   * Returns the raw file buffer.
   */
  getBuffer(key: string): Promise<Buffer>;

  /**
   * Checks whether the given key exists in storage.
   */
  exists(key: string): Promise<boolean>;
}
