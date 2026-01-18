import { PaginationMetadataDto } from './pagination-response.dto';

/**
 * Pagination helper utility.
 * Provides pure functions for building pagination metadata and calculations.
 *
 * @example
 * ```ts
 * const pagination = PaginationHelper.buildPagination(100, 2, 20);
 * // Returns: { page: 2, pageSize: 20, totalItems: 100, totalPages: 5, hasNextPage: true, hasPreviousPage: true }
 *
 * const skip = PaginationHelper.calculateSkip(2, 20);
 * // Returns: 20 (for database OFFSET)
 * ```
 */
export class PaginationHelper {
  /**
   * Build pagination metadata from total items and page parameters.
   *
   * @param total - Total number of items
   * @param page - Current page number (1-indexed)
   * @param pageSize - Number of items per page
   * @returns Pagination metadata DTO
   */
  static buildPagination(
    total: number,
    page: number,
    pageSize: number,
  ): PaginationMetadataDto {
    const totalPages = Math.ceil(total / pageSize);

    return {
      page,
      pageSize,
      totalItems: total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  /**
   * Calculate skip offset for database queries (OFFSET in SQL).
   * Used with Prisma's `skip()` method.
   *
   * @param page - Current page number (1-indexed)
   * @param pageSize - Number of items per page
   * @returns Number of items to skip
   *
   * @example
   * ```ts
   * prisma.queryProcessLog.findMany({
   *   skip: PaginationHelper.calculateSkip(page, pageSize),
   *   take: pageSize,
   * })
   * ```
   */
  static calculateSkip(page: number, pageSize: number): number {
    return (page - 1) * pageSize;
  }

  /**
   * Validate if a page number is within valid range.
   *
   * @param page - Page number to validate
   * @param totalPages - Total number of pages
   * @returns True if page is valid
   */
  static isValidPage(page: number, totalPages: number): boolean {
    return page >= 1 && page <= totalPages;
  }

  /**
   * Calculate total pages from total items and page size.
   *
   * @param total - Total number of items
   * @param pageSize - Number of items per page
   * @returns Total number of pages
   */
  static calculateTotalPages(total: number, pageSize: number): number {
    return Math.ceil(total / pageSize);
  }

  /**
   * Get the next page number, or null if already at last page.
   *
   * @param currentPage - Current page number
   * @param totalPages - Total number of pages
   * @returns Next page number or null
   */
  static getNextPage(currentPage: number, totalPages: number): number | null {
    return currentPage < totalPages ? currentPage + 1 : null;
  }

  /**
   * Get the previous page number, or null if already at first page.
   *
   * @param currentPage - Current page number
   * @returns Previous page number or null
   */
  static getPreviousPage(currentPage: number): number | null {
    return currentPage > 1 ? currentPage - 1 : null;
  }
}
