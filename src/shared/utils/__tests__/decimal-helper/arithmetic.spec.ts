import { DecimalHelper } from '../../decimal.helper';

/**
 * Unit tests for DecimalHelper arithmetic operations.
 *
 * Tests for: sum, average, multiply, divide
 * Uses AAA (Arrange-Act-Assert) pattern throughout.
 */
describe('DecimalHelper - Arithmetic Operations', () => {
  describe('sum', () => {
    describe('when adding decimal numbers', () => {
      it('returns exact sum avoiding floating-point errors', () => {
        // Arrange
        const values = [0.008, 0.001];

        // Act
        const result = DecimalHelper.sum(...values);

        // Assert
        expect(result).toBe(0.009);
        expect(result).not.toBe(0.009000000000000001); // Not floating-point result
      });
    });

    describe('when adding common floating-point problem cases', () => {
      it('returns exact sum for 0.1 + 0.2', () => {
        // Arrange
        const values = [0.1, 0.2];

        // Act
        const result = DecimalHelper.sum(...values);

        // Assert
        expect(result).toBe(0.3);
        expect(result).not.toBe(0.30000000000000004);
      });
    });

    describe('when adding multiple values', () => {
      it('returns exact sum for all values', () => {
        // Arrange
        const values = [0.01, 0.02, 0.003, 0.004];

        // Act
        const result = DecimalHelper.sum(...values);

        // Assert
        expect(result).toBe(0.037);
      });
    });

    describe('when adding single value', () => {
      it('returns the value itself', () => {
        // Arrange
        const value = 42.5;

        // Act
        const result = DecimalHelper.sum(value);

        // Assert
        expect(result).toBe(42.5);
      });
    });

    describe('when adding zeros', () => {
      it('returns zero', () => {
        // Arrange
        const values = [0, 0, 0];

        // Act
        const result = DecimalHelper.sum(...values);

        // Assert
        expect(result).toBe(0);
      });
    });

    describe('when adding negative numbers', () => {
      it('returns correct sum with negative values', () => {
        // Arrange
        const values = [0.1, -0.05, 0.025];

        // Act
        const result = DecimalHelper.sum(...values);

        // Assert
        expect(result).toBe(0.075);
      });
    });

    describe('when adding integers', () => {
      it('returns exact sum for integer values', () => {
        // Arrange
        const values = [1, 2, 3, 4, 5];

        // Act
        const result = DecimalHelper.sum(...values);

        // Assert
        expect(result).toBe(15);
      });
    });
  });

  describe('average', () => {
    describe('when averaging decimal numbers', () => {
      it('returns exact average avoiding floating-point errors', () => {
        // Arrange
        const values = [0.0075, 0.015, 0.0225];

        // Act
        const result = DecimalHelper.average(values);

        // Assert
        expect(result).toBe(0.015);
      });
    });

    describe('when averaging integers', () => {
      it('returns exact average', () => {
        // Arrange
        const values = [1, 2, 3];

        // Act
        const result = DecimalHelper.average(values);

        // Assert
        expect(result).toBe(2);
      });
    });

    describe('when averaging two values', () => {
      it('returns exact midpoint', () => {
        // Arrange
        const values = [0.1, 0.3];

        // Act
        const result = DecimalHelper.average(values);

        // Assert
        expect(result).toBe(0.2);
      });
    });

    describe('when array is empty', () => {
      it('returns zero', () => {
        // Arrange
        const values: number[] = [];

        // Act
        const result = DecimalHelper.average(values);

        // Assert
        expect(result).toBe(0);
      });
    });

    describe('when averaging single value', () => {
      it('returns the value itself', () => {
        // Arrange
        const values = [42.5];

        // Act
        const result = DecimalHelper.average(values);

        // Assert
        expect(result).toBe(42.5);
      });
    });

    describe('when averaging negative and positive numbers', () => {
      it('returns correct average', () => {
        // Arrange
        const values = [-0.1, 0, 0.1];

        // Act
        const result = DecimalHelper.average(values);

        // Assert
        expect(result).toBe(0);
      });
    });

    describe('when averaging values with repeating decimal result', () => {
      it('returns exact repeating decimal', () => {
        // Arrange
        const values = [1, 2];

        // Act
        const result = DecimalHelper.average(values);

        // Assert
        expect(result).toBe(1.5);
      });
    });
  });

  describe('multiply', () => {
    describe('when multiplying two decimals', () => {
      it('returns exact product avoiding floating-point errors', () => {
        // Arrange
        const values = [0.01, 100];

        // Act
        const result = DecimalHelper.multiply(...values);

        // Assert
        expect(result).toBe(1);
        expect(result).not.toBe(0.9999999999999999);
      });
    });

    describe('when multiplying small decimals', () => {
      it('returns exact product', () => {
        // Arrange
        const values = [0.005, 2];

        // Act
        const result = DecimalHelper.multiply(...values);

        // Assert
        expect(result).toBe(0.01);
      });
    });

    describe('when multiplying multiple values', () => {
      it('returns exact product for all values', () => {
        // Arrange
        const values = [0.1, 0.2, 0.3];

        // Act
        const result = DecimalHelper.multiply(...values);

        // Assert
        expect(result).toBe(0.006);
      });
    });

    describe('when multiplying by zero', () => {
      it('returns zero', () => {
        // Arrange
        const values = [123.456, 0];

        // Act
        const result = DecimalHelper.multiply(...values);

        // Assert
        expect(result).toBe(0);
      });
    });

    describe('when multiplying by one', () => {
      it('returns original value', () => {
        // Arrange
        const values = [42.5, 1];

        // Act
        const result = DecimalHelper.multiply(...values);

        // Assert
        expect(result).toBe(42.5);
      });
    });

    describe('when multiplying negative numbers', () => {
      it('returns positive product for two negatives', () => {
        // Arrange
        const values = [-0.5, -2];

        // Act
        const result = DecimalHelper.multiply(...values);

        // Assert
        expect(result).toBe(1);
      });

      it('returns negative product for one negative', () => {
        // Arrange
        const values = [0.5, -2];

        // Act
        const result = DecimalHelper.multiply(...values);

        // Assert
        expect(result).toBe(-1);
      });
    });

    describe('when multiplying single value', () => {
      it('returns the value itself', () => {
        // Arrange
        const value = 42.5;

        // Act
        const result = DecimalHelper.multiply(value);

        // Assert
        expect(result).toBe(42.5);
      });
    });
  });

  describe('divide', () => {
    describe('when dividing decimals evenly', () => {
      it('returns exact quotient', () => {
        // Arrange
        const dividend = 0.01;
        const divisor = 2;

        // Act
        const result = DecimalHelper.divide(dividend, divisor);

        // Assert
        expect(result).toBe(0.005);
      });
    });

    describe('when dividing with repeating decimal result', () => {
      it('returns precise repeating decimal approximation', () => {
        // Arrange
        const dividend = 1;
        const divisor = 3;

        // Act
        const result = DecimalHelper.divide(dividend, divisor);

        // Assert
        // decimal.js provides high precision for repeating decimals
        expect(result).toBeGreaterThanOrEqual(0.3333333333333333);
        expect(result).toBeLessThan(0.3333333333333334);
      });
    });

    describe('when dividing by one', () => {
      it('returns original value', () => {
        // Arrange
        const dividend = 42.5;
        const divisor = 1;

        // Act
        const result = DecimalHelper.divide(dividend, divisor);

        // Assert
        expect(result).toBe(42.5);
      });
    });

    describe('when dividing zero', () => {
      it('returns zero', () => {
        // Arrange
        const dividend = 0;
        const divisor = 5;

        // Act
        const result = DecimalHelper.divide(dividend, divisor);

        // Assert
        expect(result).toBe(0);
      });
    });

    describe('when dividing negative numbers', () => {
      it('returns negative quotient for negative dividend', () => {
        // Arrange
        const dividend = -0.1;
        const divisor = 2;

        // Act
        const result = DecimalHelper.divide(dividend, divisor);

        // Assert
        expect(result).toBe(-0.05);
      });

      it('returns negative quotient for negative divisor', () => {
        // Arrange
        const dividend = 0.1;
        const divisor = -2;

        // Act
        const result = DecimalHelper.divide(dividend, divisor);

        // Assert
        expect(result).toBe(-0.05);
      });
    });
  });
});
