import { env } from '@careerforge/config';
import { IStorageProvider } from './storage.interface.js';
import { LocalStorageProvider } from './local-storage.provider.js';
import { IVirusScanner, MockVirusScanner } from './virus-scanner.js';

export * from './storage.interface.js';
export * from './local-storage.provider.js';
export * from './virus-scanner.js';

// Default Singleton Instances
export const defaultStorageProvider: IStorageProvider = new LocalStorageProvider(env.RESUME_STORAGE_DIR);
export const defaultVirusScanner: IVirusScanner = new MockVirusScanner();
