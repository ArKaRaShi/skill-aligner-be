import { DecimalHelper } from '../../decimal.helper';

/**
 * Unit tests for DecimalHelper advanced operations.
 *
 * Tests for: create (chaining operations)
 * Uses AAA (Arrange-Act-Assert) pattern throughout.
 */
describe('DecimalHelper - Advanced Operations', () => {
  describe('create', () => {
    describe('when creating Decimal instance', () => {
      it('returns Decimal that can be chained for operations', () => {
        // Arrange
        const initialValue = 0.01;

        // Act
        const result = DecimalHelper.create(initialValue)
          .plus(0.001)
          .times(2)
          .toDecimalPlaces(4)
          .toNumber();

        // Assert
        expect(result).toBe(0.022);
      });
    });

    describe('when chaining multiple operations', () => {
      it('returns exact result for complex calculation', () => {
        // Arrange
        const initialValue = 100;

        // Act
        const result = DecimalHelper.create(initialValue)
          .times(0.15)
          .plus(5)
          .dividedBy(2)
          .toDecimalPlaces(2)
          .toNumber();

        // Assert
        expect(result).toBe(10);
      });
    });

    describe('when chaining with rounding', () => {
      it('handles precision correctly through chain', () => {
        // Arrange
        const initialValue = 0.1;

        // Act
        const result = DecimalHelper.create(initialValue)
          .plus(0.2)
          .times(3)
          .toDecimalPlaces(2)
          .toNumber();

        // Assert
        // (0.1 + 0.2) * 3 = 0.9 exactly (no floating-point errors)
        expect(result).toBe(0.9);
        expect(result).not.toBe(0.9000000000000001);
      });
    });

    describe('when creating from zero', () => {
      it('returns zero that can be chained', () => {
        // Arrange
        const initialValue = 0;

        // Act
        const result = DecimalHelper.create(initialValue)
          .plus(0.123)
          .toNumber();

        // Assert
        expect(result).toBe(0.123);
      });
    });

    describe('when creating from negative number', () => {
      it('preserves sign through chain', () => {
        // Arrange
        const initialValue = -10;

        // Act
        const result = DecimalHelper.create(initialValue)
          .dividedBy(4)
          .toDecimalPlaces(2)
          .toNumber();

        // Assert
        expect(result).toBe(-2.5);
      });
    });

    describe('when creating and applying multiple transformations', () => {
      it('handles complex calculation with exact precision', () => {
        // Arrange
        const initialValue = 1;

        // Act
        const result = DecimalHelper.create(initialValue)
          .dividedBy(3)
          .times(3)
          .toDecimalPlaces(10)
          .toNumber();

        // Assert
        // Should be very close to 1 (1/3 * 3 = 1)
        expect(result).toBeCloseTo(1, 10);
      });
    });
  });
});
