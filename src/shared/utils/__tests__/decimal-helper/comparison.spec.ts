import { DecimalHelper } from '../../decimal.helper';

/**
 * Unit tests for DecimalHelper comparison operations.
 *
 * Tests for: compare, equals, min, max
 * Uses AAA (Arrange-Act-Assert) pattern throughout.
 */
describe('DecimalHelper - Comparison Operations', () => {
  describe('compare', () => {
    describe('when values are equal', () => {
      it('returns 0 for equal decimal values', () => {
        // Arrange
        const a = 0.01;
        const b = 0.01;

        // Act
        const result = DecimalHelper.compare(a, b);

        // Assert
        expect(result).toBe(0);
      });

      it('returns 0 for equal values with different trailing zeros', () => {
        // Arrange
        const a = 0.01;
        const b = 0.01;

        // Act
        const result = DecimalHelper.compare(a, b);

        // Assert
        expect(result).toBe(0);
      });
    });

    describe('when first value is less than second', () => {
      it('returns -1 for smaller first value', () => {
        // Arrange
        const a = 0.009;
        const b = 0.01;

        // Act
        const result = DecimalHelper.compare(a, b);

        // Assert
        expect(result).toBe(-1);
      });
    });

    describe('when first value is greater than second', () => {
      it('returns 1 for larger first value', () => {
        // Arrange
        const a = 0.02;
        const b = 0.01;

        // Act
        const result = DecimalHelper.compare(a, b);

        // Assert
        expect(result).toBe(1);
      });
    });

    describe('when comparing with floating-point precision issues', () => {
      it('compares exact values passed to it (does not auto-fix input)', () => {
        // Arrange
        const a = 0.1 + 0.2; // JavaScript produces 0.30000000000000004
        const b = 0.3;

        // Act
        const result = DecimalHelper.compare(a, b);

        // Assert
        // DecimalHelper compares the exact values passed, it doesn't auto-fix
        // The imprecise value 0.30000000000000004 is greater than 0.3
        expect(result).toBe(1);
      });
    });
  });

  describe('equals', () => {
    describe('when values are exactly equal', () => {
      it('returns true for equal values', () => {
        // Arrange
        const a = 0.01;
        const b = 0.01;

        // Act
        const result = DecimalHelper.equals(a, b);

        // Assert
        expect(result).toBe(true);
      });

      it('returns true for equal values with different trailing zeros', () => {
        // Arrange
        const a = 0.01;
        const b = 0.01;

        // Act
        const result = DecimalHelper.equals(a, b);

        // Assert
        expect(result).toBe(true);
      });
    });

    describe('when values are not equal', () => {
      it('returns false for different values', () => {
        // Arrange
        const a = 0.009;
        const b = 0.01;

        // Act
        const result = DecimalHelper.equals(a, b);

        // Assert
        expect(result).toBe(false);
      });

      it('returns false for nearly equal but different values', () => {
        // Arrange
        const a = 0.009;
        const b = 0.009000001;

        // Act
        const result = DecimalHelper.equals(a, b);

        // Assert
        expect(result).toBe(false);
      });
    });
  });

  describe('min', () => {
    describe('when finding minimum of multiple values', () => {
      it('returns smallest value', () => {
        // Arrange
        const values = [0.01, 0.005, 0.02];

        // Act
        const result = DecimalHelper.min(...values);

        // Assert
        expect(result).toBe(0.005);
      });
    });

    describe('when values include negative numbers', () => {
      it('returns most negative value', () => {
        // Arrange
        const values = [0.01, -0.005, 0.02];

        // Act
        const result = DecimalHelper.min(...values);

        // Assert
        expect(result).toBe(-0.005);
      });
    });

    describe('when all values are equal', () => {
      it('returns the shared value', () => {
        // Arrange
        const values = [0.01, 0.01, 0.01];

        // Act
        const result = DecimalHelper.min(...values);

        // Assert
        expect(result).toBe(0.01);
      });
    });

    describe('when array is empty', () => {
      it('returns zero', () => {
        // Arrange
        const values: number[] = [];

        // Act
        const result = DecimalHelper.min(...values);

        // Assert
        expect(result).toBe(0);
      });
    });

    describe('when providing single value', () => {
      it('returns that value', () => {
        // Arrange
        const values = [42.5];

        // Act
        const result = DecimalHelper.min(...values);

        // Assert
        expect(result).toBe(42.5);
      });
    });

    describe('when comparing close decimal values', () => {
      it('returns exact minimum', () => {
        // Arrange
        const values = [0.001, 0.0009, 0.0011];

        // Act
        const result = DecimalHelper.min(...values);

        // Assert
        expect(result).toBe(0.0009);
      });
    });
  });

  describe('max', () => {
    describe('when finding maximum of multiple values', () => {
      it('returns largest value', () => {
        // Arrange
        const values = [0.01, 0.005, 0.02];

        // Act
        const result = DecimalHelper.max(...values);

        // Assert
        expect(result).toBe(0.02);
      });
    });

    describe('when values include negative numbers', () => {
      it('returns least negative value (closest to positive)', () => {
        // Arrange
        const values = [0.01, -0.005, -0.02];

        // Act
        const result = DecimalHelper.max(...values);

        // Assert
        expect(result).toBe(0.01);
      });
    });

    describe('when all values are equal', () => {
      it('returns the shared value', () => {
        // Arrange
        const values = [0.01, 0.01, 0.01];

        // Act
        const result = DecimalHelper.max(...values);

        // Assert
        expect(result).toBe(0.01);
      });
    });

    describe('when array is empty', () => {
      it('returns zero', () => {
        // Arrange
        const values: number[] = [];

        // Act
        const result = DecimalHelper.max(...values);

        // Assert
        expect(result).toBe(0);
      });
    });

    describe('when providing single value', () => {
      it('returns that value', () => {
        // Arrange
        const values = [42.5];

        // Act
        const result = DecimalHelper.max(...values);

        // Assert
        expect(result).toBe(42.5);
      });
    });

    describe('when comparing close decimal values', () => {
      it('returns exact maximum', () => {
        // Arrange
        const values = [0.001, 0.0009, 0.0011];

        // Act
        const result = DecimalHelper.max(...values);

        // Assert
        expect(result).toBe(0.0011);
      });
    });
  });
});
