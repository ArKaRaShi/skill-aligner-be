export class ArrayHelper {
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
