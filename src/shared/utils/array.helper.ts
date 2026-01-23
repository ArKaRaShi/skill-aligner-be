/**
 * Batch with metadata including batch number
 */
export interface Batch<T> {
  /** 1-indexed batch number */
  batchNumber: number;
  /** Total number of batches */
  totalBatches: number;
  /** Items in this batch */
  items: T[];
}

export class ArrayHelper {
  /**
   * Splits an array into batches of a specified size.
   *
   * @param arr - The array to chunk
   * @param size - The size of each batch (must be > 0)
   * @returns Array of batches with metadata (batchNumber, totalBatches, items)
   *
   * @example
   * ```typescript
   * const items = [1, 2, 3, 4, 5];
   * const batches = ArrayHelper.chunk(items, 2);
   * // [
   * //   { batchNumber: 1, totalBatches: 3, items: [1, 2] },
   * //   { batchNumber: 2, totalBatches: 3, items: [3, 4] },
   * //   { batchNumber: 3, totalBatches: 3, items: [5] },
   * // ]
   * ```
   */
  static chunk<T>(arr: T[], size: number): Batch<T>[] {
    if (size <= 0) {
      throw new Error(`Chunk size must be greater than 0, got: ${size}`);
    }

    if (arr.length === 0) {
      return [];
    }

    const totalBatches = Math.ceil(arr.length / size);
    const batches: Batch<T>[] = [];

    for (let i = 0; i < arr.length; i += size) {
      const batchNumber = Math.floor(i / size) + 1;
      const items = arr.slice(i, i + size);
      batches.push({ batchNumber, totalBatches, items });
    }

    return batches;
  }

  /**
   * Sorts an array of objects by a numeric key in descending order.
   *
   * @param arr - The array to sort
   * @param key - The key to sort by (must be a numeric property)
   * @returns A new array sorted by the specified key in descending order
   */
  static sortByNumberKeyDesc<T, K extends keyof T>(
    arr: T[],
    key: T[K] extends number ? K : never,
  ): T[] {
    return arr.sort((a, b) => {
      const valA = a[key];
      const valB = b[key];

      if (
        valA === undefined ||
        valB === undefined ||
        valA === null ||
        valB === null
      ) {
        return 0;
      }

      // TypeScript now ensures valA and valB are numbers
      if (valA < valB) {
        return 1;
      }
      if (valA > valB) {
        return -1;
      }
      return 0;
    });
  }

  /**
   * Sorts an array of objects by a numeric key in ascending order.
   *
   * @param arr - The array to sort
   * @param key - The key to sort by (must be a numeric property)
   * @returns A new array sorted by the specified key in ascending order
   */
  static sortByNumberKeyAsc<T, K extends keyof T>(
    arr: T[],
    key: T[K] extends number ? K : never,
  ): T[] {
    return arr.sort((a, b) => {
      const valA = a[key];
      const valB = b[key];

      if (
        valA === undefined ||
        valB === undefined ||
        valA === null ||
        valB === null
      ) {
        return 0;
      }

      // TypeScript now ensures valA and valB are numbers
      if (valA < valB) {
        return -1;
      }
      if (valA > valB) {
        return 1;
      }
      return 0;
    });
  }
}
