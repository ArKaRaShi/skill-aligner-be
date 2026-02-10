import { DecimalHelper } from '../../decimal.helper';

/**
 * Unit tests for DecimalHelper rounding and precision operations.
 *
 * Tests for: round, fixPrecision
 * Uses AAA (Arrange-Act-Assert) pattern throughout.
 */
describe('DecimalHelper - Rounding & Precision', () => {
  describe('round', () => {
    describe('when rounding to default 2 decimal places', () => {
      it('returns correctly rounded value', () => {
        // Arrange
        const value = 0.015678;

        // Act
        const result = DecimalHelper.round(value);

        // Assert
        expect(result).toBe(0.02);
      });
    });

    describe('when rounding to 3 decimal places', () => {
      it('returns correctly rounded value', () => {
        // Arrange
        const value = 0.0090001;

        // Act
        const result = DecimalHelper.round(value, 3);

        // Assert
        expect(result).toBe(0.009);
      });
    });

    describe('when rounding to 0 decimal places', () => {
      it('returns nearest integer', () => {
        // Arrange
        const value = 3.7;

        // Act
        const result = DecimalHelper.round(value, 0);

        // Assert
        expect(result).toBe(4);
      });
    });

    describe('when rounding exactly halfway', () => {
      it('uses round half up (default decimal.js behavior)', () => {
        // Arrange
        const value = 2.5;

        // Act
        const result = DecimalHelper.round(value, 0);

        // Assert
        expect(result).toBe(3); // decimal.js uses ROUND_HALF_UP by default
      });
    });

    describe('when rounding small decimal', () => {
      it('returns correctly rounded value for small numbers', () => {
        // Arrange
        const value = 0.0004999;

        // Act
        const result = DecimalHelper.round(value, 5);

        // Assert
        expect(result).toBe(0.0005);
      });
    });

    describe('when rounding large number', () => {
      it('returns correctly rounded value', () => {
        // Arrange
        const value = 1234.5678;

        // Act
        const result = DecimalHelper.round(value, 2);

        // Assert
        expect(result).toBe(1234.57);
      });
    });

    describe('when rounding zero', () => {
      it('returns zero', () => {
        // Arrange
        const value = 0;

        // Act
        const result = DecimalHelper.round(value);

        // Assert
        expect(result).toBe(0);
      });
    });

    describe('when rounding negative number', () => {
      it('returns correctly rounded negative value', () => {
        // Arrange
        const value = -3.7;

        // Act
        const result = DecimalHelper.round(value, 0);

        // Assert
        expect(result).toBe(-4);
      });
    });
  });

  describe('fixPrecision', () => {
    describe('when fixing floating-point imprecision', () => {
      it('returns exact decimal for 0.009000000000000001', () => {
        // Arrange
        const value = 0.009000000000000001;

        // Act
        const result = DecimalHelper.fixPrecision(value);

        // Assert
        expect(result).toBe(0.009);
        expect(result).not.toBe(0.009000000000000001);
      });
    });

    describe('when fixing classic 0.1 + 0.2 error', () => {
      it('returns exact 0.3', () => {
        // Arrange
        const value = 0.30000000000000004;

        // Act
        const result = DecimalHelper.fixPrecision(value);

        // Assert
        expect(result).toBe(0.3);
      });
    });

    describe('when fixing to custom decimal places', () => {
      it('returns exact decimal with specified places', () => {
        // Arrange
        const value = 0.123456789;

        // Act
        const result = DecimalHelper.fixPrecision(value, 4);

        // Assert
        expect(result).toBe(0.1235);
      });
    });

    describe('when fixing already precise number', () => {
      it('returns same value', () => {
        // Arrange
        const value = 0.5;

        // Act
        const result = DecimalHelper.fixPrecision(value);

        // Assert
        expect(result).toBe(0.5);
      });
    });

    describe('when fixing zero', () => {
      it('returns zero', () => {
        // Arrange
        const value = 0;

        // Act
        const result = DecimalHelper.fixPrecision(value);

        // Assert
        expect(result).toBe(0);
      });
    });

    describe('when fixing negative imprecision', () => {
      it('returns exact negative decimal', () => {
        // Arrange
        const value = -0.30000000000000004;

        // Act
        const result = DecimalHelper.fixPrecision(value);

        // Assert
        expect(result).toBe(-0.3);
      });
    });

    describe('when fixing very small imprecision', () => {
      it('returns exact small decimal', () => {
        // Arrange
        const value = 0.00000000000000001;

        // Act
        const result = DecimalHelper.fixPrecision(value, 6);

        // Assert
        expect(result).toBe(0);
      });
    });
  });
});
