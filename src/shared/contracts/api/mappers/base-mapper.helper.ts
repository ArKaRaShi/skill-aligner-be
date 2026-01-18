import { ClassConstructor, plainToInstance } from 'class-transformer';

/**
 * Base mapper helper with common transformation utilities.
 * Centralizes the `excludeExtraneousValues` option used across the project.
 *
 * @example
 * ```ts
 * // Transform single object
 * const dto = BaseMapperHelper.toDto(MyResponseDto, domainObject);
 *
 * // Transform array
 * const dtos = BaseMapperHelper.toDtoArray(MyResponseDto, domainObjects);
 *
 * // Date conversion
 * const isoDate = BaseMapperHelper.toIsoDate(dateObject);
 *
 * // Duration conversion
 * const seconds = BaseMapperHelper.msToSeconds(5000); // Returns: 5
 * ```
 */
export class BaseMapperHelper {
  /**
   * Transform domain object to DTO instance using class-transformer.
   * Centralizes the `excludeExtraneousValues` option.
   *
   * @param dtoClass - DTO class constructor
   * @param data - Domain object or plain data
   * @returns DTO instance with only exposed properties
   *
   * @example
   * ```ts
   * const facultyDto = BaseMapperHelper.toDto(FacultyResponseDto, facultyEntity);
   * ```
   */
  static toDto<TDto, TData>(
    dtoClass: ClassConstructor<TDto>,
    data: TData,
  ): TDto {
    return plainToInstance(dtoClass, data, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Transform array of domain objects to DTO instances.
   *
   * @param dtoClass - DTO class constructor
   * @param dataArray - Array of domain objects
   * @returns Array of DTO instances
   *
   * @example
   * ```ts
   * const facultyDtos = BaseMapperHelper.toDtoArray(FacultyResponseDto, facultyEntities);
   * ```
   */
  static toDtoArray<TDto, TData>(
    dtoClass: ClassConstructor<TDto>,
    dataArray: TData[],
  ): TDto[] {
    return dataArray.map((data) => this.toDto(dtoClass, data));
  }

  /**
   * Convert Date or null/undefined to ISO string or null.
   * Useful for API responses that require ISO 8601 format.
   *
   * @param date - Date object or null/undefined
   * @returns ISO 8601 string or null
   *
   * @example
   * ```ts
   * const responseDto = {
   *   createdAt: BaseMapperHelper.toIsoDate(entity.createdAt),
   *   completedAt: BaseMapperHelper.toIsoDate(entity.completedAt),
   * };
   * ```
   */
  static toIsoDate(date: Date | null | undefined): string | null {
    return date ? date.toISOString() : null;
  }

  /**
   * Convert array of Dates to ISO strings.
   *
   * @param dates - Array of Date objects
   * @returns Array of ISO 8601 strings
   */
  static toIsoDateArray(dates: (Date | null | undefined)[]): string[] {
    return dates.map((date) => this.toIsoDate(date)!).filter((d) => d !== null);
  }

  /**
   * Convert milliseconds to seconds (rounded).
   * Useful for displaying durations in a human-readable format.
   *
   * @param ms - Duration in milliseconds
   * @returns Duration in seconds (rounded), or null if input is null/undefined
   *
   * @example
   * ```ts
   * const seconds = BaseMapperHelper.msToSeconds(5432); // Returns: 5
   * const duration = BaseMapperHelper.msToSeconds(null); // Returns: null
   * ```
   */
  static msToSeconds(ms: number | null | undefined): number | null {
    return ms !== null && ms !== undefined ? Math.round(ms / 1000) : null;
  }

  /**
   * Convert seconds to milliseconds.
   *
   * @param seconds - Duration in seconds
   * @returns Duration in milliseconds
   *
   * @example
   * ```ts
   * const ms = BaseMapperHelper.secondsToMs(5); // Returns: 5000
   * ```
   */
  static secondsToMs(seconds: number): number {
    return seconds * 1000;
  }

  /**
   * Safely extract a nested property value or return default.
   * Useful for optional nested properties in DTOs.
   *
   * @param obj - Object to extract from
   * @param path - Dot-notation path (e.g., 'user.profile.name')
   * @param defaultValue - Default value if path doesn't exist
   * @returns Extracted value or default
   *
   * @example
   * ```ts
   * const name = BaseMapperHelper.safeGet(user, 'profile.name', 'Anonymous');
   * ```
   */
  static safeGet<T>(
    obj: Record<string, unknown> | null | undefined,
    path: string,
    defaultValue: T,
  ): T {
    if (!obj) return defaultValue;

    return path.split('.').reduce<unknown>((current, key) => {
      return (current as Record<string, unknown>)?.[key] ?? defaultValue;
    }, obj) as T;
  }

  /**
   * Create a summary object from an array, calculating count and optionally a custom value.
   * Useful for creating count summaries in responses.
   *
   * @param array - Array to summarize
   * @param valueExtractor - Optional function to extract a numeric value from each item
   * @returns Summary with count and sum (if extractor provided)
   *
   * @example
   * ```ts
   * const summary = BaseMapperHelper.summarizeArray(courses, (c) => c.score);
   * // Returns: { count: 10, sum: 85 }
   * ```
   */
  static summarizeArray<T>(
    array: T[],
    valueExtractor?: (item: T) => number,
  ): { count: number; sum?: number } {
    const count = array.length;

    if (!valueExtractor) {
      return { count };
    }

    const sum = array.reduce((acc, item) => acc + valueExtractor(item), 0);

    return { count, sum };
  }
}
