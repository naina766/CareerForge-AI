/// <reference types="node" />
export interface VirusScanResult {
  isClean: boolean;
  threat?: string;
}

export interface IVirusScanner {
  scan(buffer: Buffer): Promise<VirusScanResult>;
}

/**
 * MockVirusScanner for local development.
 * In production, this can be connected to ClamAV or a cloud malware analysis daemon.
 */
export class MockVirusScanner implements IVirusScanner {
  async scan(buffer: Buffer): Promise<VirusScanResult> {
    // Basic test check: reject EICAR test string if present
    const eicarSignature = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
    const content = buffer.toString('utf-8', 0, Math.min(buffer.length, 1024));

    if (content.includes(eicarSignature)) {
      return {
        isClean: false,
        threat: 'EICAR-Test-Signature',
      };
    }

    return {
      isClean: true,
    };
  }
}
