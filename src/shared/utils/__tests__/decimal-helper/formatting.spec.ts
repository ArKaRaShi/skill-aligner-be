import { DecimalHelper } from '../../decimal.helper';

/**
 * Unit tests for DecimalHelper formatting operations.
 *
 * Tests for: formatCurrency, formatCostDisplay, formatPercentage, formatTime
 * Uses AAA (Arrange-Act-Assert) pattern throughout.
 */
describe('DecimalHelper - Formatting Operations', () => {
  describe('formatCurrency', () => {
    describe('when formatting to default 6 decimal places', () => {
      it('returns formatted string (without trailing zeros)', () => {
        // Arrange
        const value = 0.009;

        // Act
        const result = DecimalHelper.formatCurrency(value);

        // Assert
        // decimal.js toString() doesn't add trailing zeros
        expect(result).toBe('0.009');
      });
    });

    describe('when formatting to custom decimal places', () => {
      it('returns formatted string rounded to specified places', () => {
        // Arrange
        const value = 0.01;

        // Act
        const result = DecimalHelper.formatCurrency(value, 4);

        // Assert
        expect(result).toBe('0.01');
      });
    });

    describe('when formatting integer', () => {
      it('returns string representation', () => {
        // Arrange
        const value = 1;

        // Act
        const result = DecimalHelper.formatCurrency(value, 2);

        // Assert
        expect(result).toBe('1');
      });
    });

    describe('when formatting zero', () => {
      it('returns zero string', () => {
        // Arrange
        const value = 0;

        // Act
        const result = DecimalHelper.formatCurrency(value);

        // Assert
        expect(result).toBe('0');
      });
    });

    describe('when formatting large number', () => {
      it('returns formatted string with decimal places', () => {
        // Arrange
        const value = 1234.5678;

        // Act
        const result = DecimalHelper.formatCurrency(value, 2);

        // Assert
        expect(result).toBe('1234.57');
      });
    });

    describe('when formatting negative number', () => {
      it('returns formatted string with negative sign', () => {
        // Arrange
        const value = -0.015;

        // Act
        const result = DecimalHelper.formatCurrency(value, 3);

        // Assert
        expect(result).toBe('-0.015');
      });
    });
  });

  describe('formatCost', () => {
    describe('when formatting costs for console/UI display', () => {
      it('returns formatted string with 4 decimal places', () => {
        // Arrange
        const value = 0.0001234;

        // Act
        const result = DecimalHelper.formatCost(value);

        // Assert
        expect(result).toBe('0.0001');
      });

      it('returns formatted string for typical cost', () => {
        // Arrange
        const value = 0.009;

        // Act
        const result = DecimalHelper.formatCost(value);

        // Assert
        expect(result).toBe('0.009');
      });
    });

    describe('when handling edge cases', () => {
      it('returns zero string for zero input', () => {
        // Arrange
        const value = 0;

        // Act
        const result = DecimalHelper.formatCost(value);

        // Assert
        expect(result).toBe('0');
      });

      it('formats very small micro-costs', () => {
        // Arrange
        const value = 0.00001;

        // Act
        const result = DecimalHelper.formatCost(value);

        // Assert
        expect(result).toBe('0'); // Rounds to 0 at 4 decimals
      });

      it('formats larger cost values', () => {
        // Arrange
        const value = 1.23456;

        // Act
        const result = DecimalHelper.formatCost(value);

        // Assert
        expect(result).toBe('1.2346');
      });
    });

    describe('when formatting for readability', () => {
      it('provides more readable display than full COST precision', () => {
        // Arrange
        const fullCostValue = 0.000123456;

        // Act
        const displayResult = DecimalHelper.formatCost(fullCostValue);

        // Assert
        expect(displayResult).toBe('0.0001'); // 4 decimals vs 6 for COST
        expect(displayResult.length).toBeLessThanOrEqual(6); // Compact string
      });
    });
  });

  describe('formatPercentage', () => {
    describe('when formatting decimal values as percentage strings', () => {
      it('multiplies by 100 and formats to 2 decimal places', () => {
        // Arrange
        const value = 0.3333;

        // Act
        const result = DecimalHelper.formatPercentage(value);

        // Assert
        expect(result).toBe('33.33');
      });

      it('formats different percentage value', () => {
        // Arrange
        const value = 0.6666;

        // Act
        const result = DecimalHelper.formatPercentage(value);

        // Assert
        expect(result).toBe('66.66');
      });
    });

    describe('when handling edge cases', () => {
      it('returns "0.00" for zero input', () => {
        // Arrange
        const value = 0;

        // Act
        const result = DecimalHelper.formatPercentage(value);

        // Assert
        expect(result).toBe('0.00');
      });

      it('returns "100.00" for full percentage', () => {
        // Arrange
        const value = 1;

        // Act
        const result = DecimalHelper.formatPercentage(value);

        // Assert
        expect(result).toBe('100.00');
      });

      it('handles small percentages', () => {
        // Arrange
        const value = 0.001;

        // Act
        const result = DecimalHelper.formatPercentage(value);

        // Assert
        expect(result).toBe('0.10');
      });
    });

    describe('when formatting for display output', () => {
      it('does not include percent sign (caller adds it)', () => {
        // Arrange
        const value = 0.5;

        // Act
        const result = DecimalHelper.formatPercentage(value);

        // Assert
        expect(result).toBe('50.00');
        expect(result).not.toContain('%');
      });
    });
  });

  describe('formatTime', () => {
    describe('when formatting duration in seconds', () => {
      it('returns formatted string with 2 decimal places', () => {
        // Arrange
        const seconds = 1.23456;

        // Act
        const result = DecimalHelper.formatTime(seconds);

        // Assert
        expect(result).toBe('1.23');
      });

      it('returns formatted string for typical duration', () => {
        // Arrange
        const seconds = 0.999;

        // Act
        const result = DecimalHelper.formatTime(seconds);

        // Assert
        expect(result).toBe('1.00');
      });
    });

    describe('when handling edge cases', () => {
      it('returns "0.00" for zero input', () => {
        // Arrange
        const seconds = 0;

        // Act
        const result = DecimalHelper.formatTime(seconds);

        // Assert
        expect(result).toBe('0.00');
      });

      it('formats very short durations', () => {
        // Arrange
        const seconds = 0.001;

        // Act
        const result = DecimalHelper.formatTime(seconds);

        // Assert
        expect(result).toBe('0.00');
      });

      it('formats longer durations', () => {
        // Arrange
        const seconds = 123.456;

        // Act
        const result = DecimalHelper.formatTime(seconds);

        // Assert
        expect(result).toBe('123.46');
      });
    });

    describe('when converting from milliseconds', () => {
      it('handles common conversion scenario (ms to seconds)', () => {
        // Arrange
        const milliseconds = 1234;

        // Act
        const result = DecimalHelper.formatTime(milliseconds / 1000);

        // Assert
        expect(result).toBe('1.23');
      });
    });
  });
});
