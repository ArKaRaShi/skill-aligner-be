import { PaginationMetadataDto } from '../pagination-metadata-response.dto';
import { PaginationHelper } from '../pagination.helper';

describe('PaginationHelper', () => {
  describe('buildPagination', () => {
    it('returns complete pagination metadata for standard page', () => {
      // Arrange
      const total = 100;
      const page = 2;
      const pageSize = 20;

      // Act
      const result = PaginationHelper.buildPagination(total, page, pageSize);

      // Assert
      const expected: PaginationMetadataDto = {
        page: 2,
        pageSize: 20,
        totalItems: 100,
        totalPages: 5,
        hasNextPage: true,
        hasPreviousPage: true,
      };
      expect(result).toEqual(expected);
    });

    it('returns pagination metadata for first page', () => {
      // Arrange
      const total = 100;
      const page = 1;
      const pageSize = 20;

      // Act
      const result = PaginationHelper.buildPagination(total, page, pageSize);

      // Assert
      expect(result.hasPreviousPage).toBe(false);
      expect(result.hasNextPage).toBe(true);
      expect(result.page).toBe(1);
    });

    it('returns pagination metadata for last page', () => {
      // Arrange
      const total = 100;
      const page = 5;
      const pageSize = 20;

      // Act
      const result = PaginationHelper.buildPagination(total, page, pageSize);

      // Assert
      expect(result.hasNextPage).toBe(false);
      expect(result.hasPreviousPage).toBe(true);
      expect(result.page).toBe(5);
    });

    it('handles single page result set', () => {
      // Arrange
      const total = 15;
      const page = 1;
      const pageSize = 20;

      // Act
      const result = PaginationHelper.buildPagination(total, page, pageSize);

      // Assert
      expect(result.totalPages).toBe(1);
      expect(result.hasNextPage).toBe(false);
      expect(result.hasPreviousPage).toBe(false);
    });

    it('rounds up total pages when items do not divide evenly', () => {
      // Arrange
      const total = 101;
      const page = 1;
      const pageSize = 20;

      // Act
      const result = PaginationHelper.buildPagination(total, page, pageSize);

      // Assert
      expect(result.totalPages).toBe(6);
    });

    it('handles empty result set', () => {
      // Arrange
      const total = 0;
      const page = 1;
      const pageSize = 20;

      // Act
      const result = PaginationHelper.buildPagination(total, page, pageSize);

      // Assert
      expect(result.totalPages).toBe(0);
      expect(result.totalItems).toBe(0);
      expect(result.hasNextPage).toBe(false);
    });

    it('handles page size of 1', () => {
      // Arrange
      const total = 5;
      const page = 3;
      const pageSize = 1;

      // Act
      const result = PaginationHelper.buildPagination(total, page, pageSize);

      // Assert
      expect(result.totalPages).toBe(5);
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPreviousPage).toBe(true);
    });
  });

  describe('calculateSkip', () => {
    it('returns 0 for first page', () => {
      // Arrange
      const page = 1;
      const pageSize = 20;

      // Act
      const result = PaginationHelper.calculateSkip(page, pageSize);

      // Assert
      expect(result).toBe(0);
    });

    it('calculates correct offset for page 2 with page size 20', () => {
      // Arrange
      const page = 2;
      const pageSize = 20;

      // Act
      const result = PaginationHelper.calculateSkip(page, pageSize);

      // Assert
      expect(result).toBe(20);
    });

    it('calculates correct offset for page 5 with page size 10', () => {
      // Arrange
      const page = 5;
      const pageSize = 10;

      // Act
      const result = PaginationHelper.calculateSkip(page, pageSize);

      // Assert
      expect(result).toBe(40);
    });

    it('handles large page numbers', () => {
      // Arrange
      const page = 100;
      const pageSize = 50;

      // Act
      const result = PaginationHelper.calculateSkip(page, pageSize);

      // Assert
      expect(result).toBe(4950);
    });

    it('handles page size of 1', () => {
      // Arrange
      const page = 10;
      const pageSize = 1;

      // Act
      const result = PaginationHelper.calculateSkip(page, pageSize);

      // Assert
      expect(result).toBe(9);
    });
  });

  describe('isValidPage', () => {
    it('returns true for valid first page', () => {
      // Arrange
      const page = 1;
      const totalPages = 5;

      // Act
      const result = PaginationHelper.isValidPage(page, totalPages);

      // Assert
      expect(result).toBe(true);
    });

    it('returns true for valid middle page', () => {
      // Arrange
      const page = 3;
      const totalPages = 5;

      // Act
      const result = PaginationHelper.isValidPage(page, totalPages);

      // Assert
      expect(result).toBe(true);
    });

    it('returns true for valid last page', () => {
      // Arrange
      const page = 5;
      const totalPages = 5;

      // Act
      const result = PaginationHelper.isValidPage(page, totalPages);

      // Assert
      expect(result).toBe(true);
    });

    it('returns false for page less than 1', () => {
      // Arrange
      const page = 0;
      const totalPages = 5;

      // Act
      const result = PaginationHelper.isValidPage(page, totalPages);

      // Assert
      expect(result).toBe(false);
    });

    it('returns false for negative page', () => {
      // Arrange
      const page = -1;
      const totalPages = 5;

      // Act
      const result = PaginationHelper.isValidPage(page, totalPages);

      // Assert
      expect(result).toBe(false);
    });

    it('returns false for page beyond total pages', () => {
      // Arrange
      const page = 6;
      const totalPages = 5;

      // Act
      const result = PaginationHelper.isValidPage(page, totalPages);

      // Assert
      expect(result).toBe(false);
    });

    it('returns false when total pages is 0', () => {
      // Arrange
      const page = 1;
      const totalPages = 0;

      // Act
      const result = PaginationHelper.isValidPage(page, totalPages);

      // Assert
      expect(result).toBe(false);
    });

    it('handles single page scenario', () => {
      // Arrange
      const page = 1;
      const totalPages = 1;

      // Act
      const result = PaginationHelper.isValidPage(page, totalPages);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('calculateTotalPages', () => {
    it('calculates pages when items divide evenly', () => {
      // Arrange
      const total = 100;
      const pageSize = 20;

      // Act
      const result = PaginationHelper.calculateTotalPages(total, pageSize);

      // Assert
      expect(result).toBe(5);
    });

    it('rounds up when items do not divide evenly', () => {
      // Arrange
      const total = 101;
      const pageSize = 20;

      // Act
      const result = PaginationHelper.calculateTotalPages(total, pageSize);

      // Assert
      expect(result).toBe(6);
    });

    it('returns 1 for single item', () => {
      // Arrange
      const total = 1;
      const pageSize = 20;

      // Act
      const result = PaginationHelper.calculateTotalPages(total, pageSize);

      // Assert
      expect(result).toBe(1);
    });

    it('returns 0 for empty result set', () => {
      // Arrange
      const total = 0;
      const pageSize = 20;

      // Act
      const result = PaginationHelper.calculateTotalPages(total, pageSize);

      // Assert
      expect(result).toBe(0);
    });

    it('handles page size of 1', () => {
      // Arrange
      const total = 5;
      const pageSize = 1;

      // Act
      const result = PaginationHelper.calculateTotalPages(total, pageSize);

      // Assert
      expect(result).toBe(5);
    });

    it('handles large page size', () => {
      // Arrange
      const total = 50;
      const pageSize = 100;

      // Act
      const result = PaginationHelper.calculateTotalPages(total, pageSize);

      // Assert
      expect(result).toBe(1);
    });

    it('handles remainder just over page boundary', () => {
      // Arrange
      const total = 81;
      const pageSize = 20;

      // Act
      const result = PaginationHelper.calculateTotalPages(total, pageSize);

      // Assert
      expect(result).toBe(5);
    });
  });

  describe('getNextPage', () => {
    it('returns next page number when not on last page', () => {
      // Arrange
      const currentPage = 2;
      const totalPages = 5;

      // Act
      const result = PaginationHelper.getNextPage(currentPage, totalPages);

      // Assert
      expect(result).toBe(3);
    });

    it('returns null when on last page', () => {
      // Arrange
      const currentPage = 5;
      const totalPages = 5;

      // Act
      const result = PaginationHelper.getNextPage(currentPage, totalPages);

      // Assert
      expect(result).toBeNull();
    });

    it('returns 2 when on first page of multiple pages', () => {
      // Arrange
      const currentPage = 1;
      const totalPages = 10;

      // Act
      const result = PaginationHelper.getNextPage(currentPage, totalPages);

      // Assert
      expect(result).toBe(2);
    });

    it('returns null for single page', () => {
      // Arrange
      const currentPage = 1;
      const totalPages = 1;

      // Act
      const result = PaginationHelper.getNextPage(currentPage, totalPages);

      // Assert
      expect(result).toBeNull();
    });

    it('returns null when total pages is 0', () => {
      // Arrange
      const currentPage = 1;
      const totalPages = 0;

      // Act
      const result = PaginationHelper.getNextPage(currentPage, totalPages);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getPreviousPage', () => {
    it('returns previous page number when not on first page', () => {
      // Arrange
      const currentPage = 3;

      // Act
      const result = PaginationHelper.getPreviousPage(currentPage);

      // Assert
      expect(result).toBe(2);
    });

    it('returns null when on first page', () => {
      // Arrange
      const currentPage = 1;

      // Act
      const result = PaginationHelper.getPreviousPage(currentPage);

      // Assert
      expect(result).toBeNull();
    });

    it('returns page 1 when on second page', () => {
      // Arrange
      const currentPage = 2;

      // Act
      const result = PaginationHelper.getPreviousPage(currentPage);

      // Assert
      expect(result).toBe(1);
    });

    it('handles large page numbers', () => {
      // Arrange
      const currentPage = 100;

      // Act
      const result = PaginationHelper.getPreviousPage(currentPage);

      // Assert
      expect(result).toBe(99);
    });

    it('returns null for page 0', () => {
      // Arrange
      const currentPage = 0;

      // Act
      const result = PaginationHelper.getPreviousPage(currentPage);

      // Assert
      expect(result).toBeNull();
    });
  });
});
