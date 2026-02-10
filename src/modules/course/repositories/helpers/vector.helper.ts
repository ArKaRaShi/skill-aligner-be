const VECTOR_PARSE_REGEX = /-?\d+\.?\d*/g;

/**
 * Parses vector data from various formats into a number array.
 * @param raw - Raw vector data (array, string, or unknown)
 * @returns Parsed vector as number array
 */
export function parseVector(raw: unknown): number[] {
  if (Array.isArray(raw)) {
    return raw.map(Number);
  }

  if (typeof raw === 'string') {
    const matches = raw.match(VECTOR_PARSE_REGEX);
    return matches ? matches.map(Number) : [];
  }

  return [];
}
