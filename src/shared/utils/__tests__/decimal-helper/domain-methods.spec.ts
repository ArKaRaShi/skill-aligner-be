import { DecimalHelper } from '../../decimal.helper';

/**
 * Unit tests for DecimalHelper domain-specific convenience methods.
 *
 * Tests for: roundCost, roundAverage, roundRate, roundScore
 * Uses AAA (Arrange-Act-Assert) pattern throughout.
 */
describe('DecimalHelper - Domain-Specific Methods', () => {
  describe('roundCost', () => {
    describe('when rounding cost values to 6 decimal places', () => {
      it('returns rounded cost for typical LLM token cost', () => {
        // Arrange
        const value = 0.0001234;

        // Act
        const result = DecimalHelper.roundCost(value);

        // Assert
        expect(result).toBe(0.000123);
      });

      it('returns rounded cost for embedding cost', () => {
        // Arrange
        const value = 0.0000999;

        // Act
        const result = DecimalHelper.roundCost(value);

        // Assert
        expect(result).toBe(0.0001);
      });
    });

    describe('when handling edge cases', () => {
      it('returns zero for zero input', () => {
        // Arrange
        const value = 0;

        // Act
        const result = DecimalHelper.roundCost(value);

        // Assert
        expect(result).toBe(0);
      });

      it('rounds up at halfway point', () => {
        // Arrange
        const value = 0.0000005; // Should round to 0.000001

        // Act
        const result = DecimalHelper.roundCost(value);

        // Assert
        expect(result).toBe(0.000001);
      });

      it('handles very small micro-costs', () => {
        // Arrange
        const value = 0.000001234;

        // Act
        const result = DecimalHelper.roundCost(value);

        // Assert
        expect(result).toBe(0.000001);
      });
    });

    describe('when aggregating costs', () => {
      it('preserves precision for total query cost', () => {
        // Arrange
        const llmCost = 0.005;
        const embeddingCost = 0.000321;

        // Act
        const total = DecimalHelper.roundCost(llmCost + embeddingCost);

        // Assert
        expect(total).toBe(0.005321);
      });
    });
  });

  describe('roundAverage', () => {
    describe('when rounding to 4 decimal places for averages', () => {
      it('returns rounded average for metric values', () => {
        // Arrange
        const value = 0.12345;

        // Act
        const result = DecimalHelper.roundAverage(value);

        // Assert
        expect(result).toBe(0.1235);
      });

      it('returns rounded average for larger values', () => {
        // Arrange
        const value = 2.12345;

        // Act
        const result = DecimalHelper.roundAverage(value);

        // Assert
        expect(result).toBe(2.1235);
      });
    });

    describe('when handling edge cases', () => {
      it('returns zero for zero input', () => {
        // Arrange
        const value = 0;

        // Act
        const result = DecimalHelper.roundAverage(value);

        // Assert
        expect(result).toBe(0);
      });

      it('rounds repeating decimals correctly', () => {
        // Arrange
        const value = 1.33333;

        // Act
        const result = DecimalHelper.roundAverage(value);

        // Assert
        expect(result).toBe(1.3333);
      });
    });

    describe('when working with statistical averages', () => {
      it('handles small precision values', () => {
        // Arrange
        const value = 0.0075;

        // Act
        const result = DecimalHelper.roundAverage(value);

        // Assert
        expect(result).toBe(0.0075);
      });
    });
  });

  describe('roundRate', () => {
    describe('when rounding to 3 decimal places for rates', () => {
      it('returns rounded rate for decimal values', () => {
        // Arrange
        const value = 0.3333;

        // Act
        const result = DecimalHelper.roundRate(value);

        // Assert
        expect(result).toBe(0.333);
      });

      it('returns rounded rate for higher precision', () => {
        // Arrange
        const value = 0.6666;

        // Act
        const result = DecimalHelper.roundRate(value);

        // Assert
        expect(result).toBe(0.667);
      });
    });

    describe('when handling edge cases', () => {
      it('returns zero for zero input', () => {
        // Arrange
        const value = 0;

        // Act
        const result = DecimalHelper.roundRate(value);

        // Assert
        expect(result).toBe(0);
      });

      it('handles rate calculations with trailing precision', () => {
        // Arrange
        const value = 0.9999;

        // Act
        const result = DecimalHelper.roundRate(value);

        // Assert
        expect(result).toBe(1);
      });
    });
  });

  describe('roundScore', () => {
    describe('when rounding evaluation scores on 1-3 Likert scale', () => {
      it('returns rounded score for decimal precision', () => {
        // Arrange
        const value = 2.333333;

        // Act
        const result = DecimalHelper.roundScore(value);

        // Assert
        expect(result).toBe(2.333);
      });

      it('returns rounded score for different value', () => {
        // Arrange
        const value = 1.666666;

        // Act
        const result = DecimalHelper.roundScore(value);

        // Assert
        expect(result).toBe(1.667);
      });
    });

    describe('when handling edge cases', () => {
      it('returns minimum score value', () => {
        // Arrange
        const value = 1;

        // Act
        const result = DecimalHelper.roundScore(value);

        // Assert
        expect(result).toBe(1);
      });

      it('returns maximum score value', () => {
        // Arrange
        const value = 3;

        // Act
        const result = DecimalHelper.roundScore(value);

        // Assert
        expect(result).toBe(3);
      });

      it('handles mid-range score', () => {
        // Arrange
        const value = 2;

        // Act
        const result = DecimalHelper.roundScore(value);

        // Assert
        expect(result).toBe(2);
      });
    });
  });
});
