import { createHash } from 'node:crypto';

export class HashHelper {
  /**
   * Generate SHA-256 hash of the input string.
   * @param input - The input string to be hashed.
   * @returns - The SHA-256 hash as a hexadecimal string.
   */
  static generateHashSHA256(input: string): string {
    return createHash('sha256').update(input).digest('hex');
  }
}
