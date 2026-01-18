import { Prisma } from '@prisma/client';

export class PrismaGlobalMapper {
  static mapPrismaMetadataToDomain(
    metadata: Prisma.JsonObject | null,
  ): Record<string, any> | null {
    if (!metadata) {
      return null;
    }

    return { ...metadata };
  }

  /**
   * Convert Prisma JsonValue to domain JSONB type.
   *
   * Prisma JSONB fields are typed as JsonValue (string | number | boolean | JsonObject | JsonArray | null).
   * This helper converts them to the appropriate domain type with proper type narrowing.
   *
   * Use this for:
   * - Domain-specific JSONB types (QueryLogInput, QueryLogMetrics, StepLlmConfig, etc.)
   * - Any JSONB field that needs to be cast to a specific domain type
   *
   * @param value - Prisma JsonValue from JSONB column
   * @returns The same value, typed as unknown for safe domain type casting (null if input is null/undefined)
   *
   * @example
   * input: PrismaGlobalMapper.jsonToDomain<QueryLogInput>(prismaLog.input)
   * metrics: PrismaGlobalMapper.jsonToDomain<QueryLogMetrics>(prismaLog.metrics)
   */
  static jsonToDomain<T = unknown>(value: Prisma.JsonValue): T | null {
    if (value === null || value === undefined) {
      return null;
    }

    // Return as unknown to allow caller to cast to their specific domain type
    return value as unknown as T;
  }

  /**
   * Convert Prisma Decimal to number.
   * Prisma returns Decimal objects for @db.Decimal fields.
   * This helper converts them to plain numbers for domain use.
   *
   * @param value - Prisma Decimal value (has toString() method)
   * @returns Number or null if value is null/undefined
   */
  static decimalToNumber(
    value: { toString(): string } | null | undefined,
  ): number | null {
    if (!value) return null;
    return parseFloat(value.toString());
  }
}
