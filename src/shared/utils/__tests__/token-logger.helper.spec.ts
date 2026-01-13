import { TokenUsage } from '../../contracts/types/token-usage.type';
import { TokenLogger, TokenMap } from '../token-logger.helper';

describe('TokenLogger', () => {
  let tokenLogger: TokenLogger;

  beforeEach(() => {
    tokenLogger = new TokenLogger();
  });

  describe('initializeTokenMap', () => {
    it('should return an empty object', () => {
      // Arrange & Act
      const result = tokenLogger.initializeTokenMap();

      // Assert
      expect(result).toEqual({});
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should return a new empty object each time', () => {
      // Arrange & Act
      const map1 = tokenLogger.initializeTokenMap();
      const map2 = tokenLogger.initializeTokenMap();

      // Assert
      expect(map1).not.toBe(map2);
      expect(map1).toEqual({});
      expect(map2).toEqual({});
    });
  });

  describe('addTokenUsage', () => {
    it('should add token usage to a new key in the map', () => {
      // Arrange
      const tokenMap: TokenMap = tokenLogger.initializeTokenMap();
      const usage: TokenUsage = {
        model: 'openai/gpt-4o-mini',
        inputTokens: 1000,
        outputTokens: 500,
      };
      const key = 'question-classifier';

      // Act
      tokenLogger.addTokenUsage(tokenMap, key, usage);

      // Assert
      expect(tokenMap[key]).toBeDefined();
      expect(tokenMap[key]).toHaveLength(1);
      expect(tokenMap[key][0].usage).toEqual(usage);
      expect(tokenMap[key][0].costEstimate.model).toBe(usage.model);
      expect(tokenMap[key][0].costEstimate.inputTokens).toBe(usage.inputTokens);
      expect(tokenMap[key][0].costEstimate.outputTokens).toBe(
        usage.outputTokens,
      );
      expect(tokenMap[key][0].costEstimate.available).toBe(true);
      expect(tokenMap[key][0].costEstimate.estimatedCost).toBeGreaterThan(0);
    });

    it('should append token usage to an existing key in the map', () => {
      // Arrange
      const tokenMap: TokenMap = tokenLogger.initializeTokenMap();
      const usage1: TokenUsage = {
        model: 'openai/gpt-4o-mini',
        inputTokens: 1000,
        outputTokens: 500,
      };
      const usage2: TokenUsage = {
        model: 'openai/gpt-4o-mini',
        inputTokens: 2000,
        outputTokens: 1000,
      };
      const key = 'question-classifier';

      // Act
      tokenLogger.addTokenUsage(tokenMap, key, usage1);
      tokenLogger.addTokenUsage(tokenMap, key, usage2);

      // Assert
      expect(tokenMap[key]).toHaveLength(2);
      expect(tokenMap[key][0].usage).toEqual(usage1);
      expect(tokenMap[key][1].usage).toEqual(usage2);
    });

    it('should handle unknown models correctly', () => {
      // Arrange
      const tokenMap: TokenMap = tokenLogger.initializeTokenMap();
      const usage: TokenUsage = {
        model: 'unknown/model',
        inputTokens: 1000,
        outputTokens: 500,
      };
      const key = 'unknown-service';

      // Act
      tokenLogger.addTokenUsage(tokenMap, key, usage);

      // Assert
      expect(tokenMap[key]).toHaveLength(1);
      expect(tokenMap[key][0].costEstimate.available).toBe(false);
      expect(tokenMap[key][0].costEstimate.estimatedCost).toBe(0);
    });

    it('should handle zero tokens', () => {
      // Arrange
      const tokenMap: TokenMap = tokenLogger.initializeTokenMap();
      const usage: TokenUsage = {
        model: 'openai/gpt-4o-mini',
        inputTokens: 0,
        outputTokens: 0,
      };
      const key = 'zero-tokens';

      // Act
      tokenLogger.addTokenUsage(tokenMap, key, usage);

      // Assert
      expect(tokenMap[key]).toHaveLength(1);
      expect(tokenMap[key][0].costEstimate.estimatedCost).toBe(0);
    });

    it('should add to multiple different keys', () => {
      // Arrange
      const tokenMap: TokenMap = tokenLogger.initializeTokenMap();
      const usage1: TokenUsage = {
        model: 'openai/gpt-4o-mini',
        inputTokens: 1000,
        outputTokens: 500,
      };
      const usage2: TokenUsage = {
        model: 'openai/gpt-4.1-nano',
        inputTokens: 500,
        outputTokens: 250,
      };

      // Act
      tokenLogger.addTokenUsage(tokenMap, 'classifier', usage1);
      tokenLogger.addTokenUsage(tokenMap, 'expander', usage2);

      // Assert
      expect(Object.keys(tokenMap)).toHaveLength(2);
      expect(tokenMap['classifier']).toHaveLength(1);
      expect(tokenMap['expander']).toHaveLength(1);
    });
  });

  describe('getTotalTokensForCategory', () => {
    it('should return null for non-existent category', () => {
      // Arrange
      const tokenMap: TokenMap = tokenLogger.initializeTokenMap();

      // Act
      const result = tokenLogger.getTotalTokensForCategory(
        tokenMap,
        'non-existent',
      );

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for empty category', () => {
      // Arrange
      const tokenMap: TokenMap = { 'empty-category': [] };

      // Act
      const result = tokenLogger.getTotalTokensForCategory(
        tokenMap,
        'empty-category',
      );

      // Assert
      expect(result).toBeNull();
    });

    it('should sum tokens for a single record', () => {
      // Arrange
      const tokenMap: TokenMap = tokenLogger.initializeTokenMap();
      const usage: TokenUsage = {
        model: 'openai/gpt-4o-mini',
        inputTokens: 1000,
        outputTokens: 500,
      };
      tokenLogger.addTokenUsage(tokenMap, 'classifier', usage);

      // Act
      const result = tokenLogger.getTotalTokensForCategory(
        tokenMap,
        'classifier',
      );

      // Assert
      expect(result).not.toBeNull();
      expect(result?.inputTokens).toBe(1000);
      expect(result?.outputTokens).toBe(500);
    });

    it('should sum tokens for multiple records in the same category', () => {
      // Arrange
      const tokenMap: TokenMap = tokenLogger.initializeTokenMap();
      const usage1: TokenUsage = {
        model: 'openai/gpt-4o-mini',
        inputTokens: 1000,
        outputTokens: 500,
      };
      const usage2: TokenUsage = {
        model: 'openai/gpt-4.1-nano',
        inputTokens: 2000,
        outputTokens: 1000,
      };
      const usage3: TokenUsage = {
        model: 'openai/gpt-4.1-mini',
        inputTokens: 500,
        outputTokens: 250,
      };
      tokenLogger.addTokenUsage(tokenMap, 'classifier', usage1);
      tokenLogger.addTokenUsage(tokenMap, 'classifier', usage2);
      tokenLogger.addTokenUsage(tokenMap, 'classifier', usage3);

      // Act
      const result = tokenLogger.getTotalTokensForCategory(
        tokenMap,
        'classifier',
      );

      // Assert
      expect(result).not.toBeNull();
      expect(result?.inputTokens).toBe(3500); // 1000 + 2000 + 500
      expect(result?.outputTokens).toBe(1750); // 500 + 1000 + 250
    });

    it('should handle records with zero tokens', () => {
      // Arrange
      const tokenMap: TokenMap = tokenLogger.initializeTokenMap();
      const usage1: TokenUsage = {
        model: 'openai/gpt-4o-mini',
        inputTokens: 1000,
        outputTokens: 500,
      };
      const usage2: TokenUsage = {
        model: 'openai/gpt-4o-mini',
        inputTokens: 0,
        outputTokens: 0,
      };
      tokenLogger.addTokenUsage(tokenMap, 'classifier', usage1);
      tokenLogger.addTokenUsage(tokenMap, 'classifier', usage2);

      // Act
      const result = tokenLogger.getTotalTokensForCategory(
        tokenMap,
        'classifier',
      );

      // Assert
      expect(result).not.toBeNull();
      expect(result?.inputTokens).toBe(1000);
      expect(result?.outputTokens).toBe(500);
    });

    it('should handle fractional token amounts', () => {
      // Arrange
      const tokenMap: TokenMap = tokenLogger.initializeTokenMap();
      const usage1: TokenUsage = {
        model: 'openai/gpt-4o-mini',
        inputTokens: 100.5,
        outputTokens: 50.25,
      };
      const usage2: TokenUsage = {
        model: 'openai/gpt-4o-mini',
        inputTokens: 200.75,
        outputTokens: 100.5,
      };
      tokenLogger.addTokenUsage(tokenMap, 'classifier', usage1);
      tokenLogger.addTokenUsage(tokenMap, 'classifier', usage2);

      // Act
      const result = tokenLogger.getTotalTokensForCategory(
        tokenMap,
        'classifier',
      );

      // Assert
      expect(result).not.toBeNull();
      expect(result?.inputTokens).toBeCloseTo(301.25, 9);
      expect(result?.outputTokens).toBeCloseTo(150.75, 9);
    });
  });

  describe('getTotalCostForCategory', () => {
    it('should return null for non-existent category', () => {
      // Arrange
      const tokenMap: TokenMap = tokenLogger.initializeTokenMap();

      // Act
      const result = tokenLogger.getTotalCostForCategory(
        tokenMap,
        'non-existent',
      );

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for empty category', () => {
      // Arrange
      const tokenMap: TokenMap = { 'empty-category': [] };

      // Act
      const result = tokenLogger.getTotalCostForCategory(
        tokenMap,
        'empty-category',
      );

      // Assert
      expect(result).toBeNull();
    });

    it('should return cost for a single record', () => {
      // Arrange
      const tokenMap: TokenMap = tokenLogger.initializeTokenMap();
      const usage: TokenUsage = {
        model: 'openai/gpt-4o-mini',
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      };
      tokenLogger.addTokenUsage(tokenMap, 'classifier', usage);

      // Act
      const result = tokenLogger.getTotalCostForCategory(
        tokenMap,
        'classifier',
      );

      // Assert
      expect(result).not.toBeNull();
      expect(result).toBeCloseTo(0.75, 9); // 0.15 + 0.6
    });

    it('should sum costs for multiple records in the same category', () => {
      // Arrange
      const tokenMap: TokenMap = tokenLogger.initializeTokenMap();
      const usage1: TokenUsage = {
        model: 'openai/gpt-4o-mini',
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      };
      const usage2: TokenUsage = {
        model: 'openai/gpt-4.1-nano',
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      };
      tokenLogger.addTokenUsage(tokenMap, 'classifier', usage1);
      tokenLogger.addTokenUsage(tokenMap, 'classifier', usage2);

      // Act
      const result = tokenLogger.getTotalCostForCategory(
        tokenMap,
        'classifier',
      );

      // Assert
      expect(result).not.toBeNull();
      expect(result).toBeCloseTo(1.25, 9); // 0.75 + 0.5
    });

    it('should return zero for records with zero tokens', () => {
      // Arrange
      const tokenMap: TokenMap = tokenLogger.initializeTokenMap();
      const usage: TokenUsage = {
        model: 'openai/gpt-4o-mini',
        inputTokens: 0,
        outputTokens: 0,
      };
      tokenLogger.addTokenUsage(tokenMap, 'classifier', usage);

      // Act
      const result = tokenLogger.getTotalCostForCategory(
        tokenMap,
        'classifier',
      );

      // Assert
      expect(result).toBe(0);
    });

    it('should return zero for unknown models', () => {
      // Arrange
      const tokenMap: TokenMap = tokenLogger.initializeTokenMap();
      const usage: TokenUsage = {
        model: 'unknown/model',
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      };
      tokenLogger.addTokenUsage(tokenMap, 'classifier', usage);

      // Act
      const result = tokenLogger.getTotalCostForCategory(
        tokenMap,
        'classifier',
      );

      // Assert
      expect(result).toBe(0);
    });

    it('should handle mixed known and unknown models', () => {
      // Arrange
      const tokenMap: TokenMap = tokenLogger.initializeTokenMap();
      const usage1: TokenUsage = {
        model: 'openai/gpt-4o-mini',
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      };
      const usage2: TokenUsage = {
        model: 'unknown/model',
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      };
      tokenLogger.addTokenUsage(tokenMap, 'classifier', usage1);
      tokenLogger.addTokenUsage(tokenMap, 'classifier', usage2);

      // Act
      const result = tokenLogger.getTotalCostForCategory(
        tokenMap,
        'classifier',
      );

      // Assert
      expect(result).toBeCloseTo(0.75, 9); // Only the known model contributes
    });

    it('should handle very small costs', () => {
      // Arrange
      const tokenMap: TokenMap = tokenLogger.initializeTokenMap();
      const usage: TokenUsage = {
        model: 'openai/gpt-4o-mini',
        inputTokens: 100,
        outputTokens: 50,
      };
      tokenLogger.addTokenUsage(tokenMap, 'classifier', usage);

      // Act
      const result = tokenLogger.getTotalCostForCategory(
        tokenMap,
        'classifier',
      );

      // Assert
      expect(result).toBeCloseTo(0.000045, 9);
    });
  });

  describe('getTotalTokens', () => {
    it('should return null for empty token map', () => {
      // Arrange
      const tokenMap: TokenMap = tokenLogger.initializeTokenMap();

      // Act
      const result = tokenLogger.getTotalTokens(tokenMap);

      // Assert
      expect(result).toBeNull();
    });

    it('should sum tokens across all categories', () => {
      // Arrange
      const tokenMap: TokenMap = tokenLogger.initializeTokenMap();
      const usage1: TokenUsage = {
        model: 'openai/gpt-4o-mini',
        inputTokens: 1000,
        outputTokens: 500,
      };
      const usage2: TokenUsage = {
        model: 'openai/gpt-4.1-nano',
        inputTokens: 2000,
        outputTokens: 1000,
      };
      tokenLogger.addTokenUsage(tokenMap, 'classifier', usage1);
      tokenLogger.addTokenUsage(tokenMap, 'expander', usage2);

      // Act
      const result = tokenLogger.getTotalTokens(tokenMap);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.inputTokens).toBe(3000); // 1000 + 2000
      expect(result?.outputTokens).toBe(1500); // 500 + 1000
    });

    it('should handle multiple records in multiple categories', () => {
      // Arrange
      const tokenMap: TokenMap = tokenLogger.initializeTokenMap();
      const usage1: TokenUsage = {
        model: 'openai/gpt-4o-mini',
        inputTokens: 1000,
        outputTokens: 500,
      };
      const usage2: TokenUsage = {
        model: 'openai/gpt-4.1-nano',
        inputTokens: 2000,
        outputTokens: 1000,
      };
      const usage3: TokenUsage = {
        model: 'openai/gpt-4.1-mini',
        inputTokens: 3000,
        outputTokens: 1500,
      };
      tokenLogger.addTokenUsage(tokenMap, 'classifier', usage1);
      tokenLogger.addTokenUsage(tokenMap, 'classifier', usage2);
      tokenLogger.addTokenUsage(tokenMap, 'expander', usage3);

      // Act
      const result = tokenLogger.getTotalTokens(tokenMap);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.inputTokens).toBe(6000); // 1000 + 2000 + 3000
      expect(result?.outputTokens).toBe(3000); // 500 + 1000 + 1500
    });

    it('should handle categories with empty arrays', () => {
      // Arrange
      const tokenMap: TokenMap = {
        'empty-category': [],
        classifier: [],
      };

      // Act
      const result = tokenLogger.getTotalTokens(tokenMap);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.inputTokens).toBe(0);
      expect(result?.outputTokens).toBe(0);
    });

    it('should handle mix of populated and empty categories', () => {
      // Arrange
      const tokenMap: TokenMap = {
        'empty-category': [],
      };
      const usage: TokenUsage = {
        model: 'openai/gpt-4o-mini',
        inputTokens: 1000,
        outputTokens: 500,
      };
      tokenLogger.addTokenUsage(tokenMap, 'classifier', usage);

      // Act
      const result = tokenLogger.getTotalTokens(tokenMap);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.inputTokens).toBe(1000);
      expect(result?.outputTokens).toBe(500);
    });
  });

  describe('getTotalCost', () => {
    it('should return null for empty token map', () => {
      // Arrange
      const tokenMap: TokenMap = tokenLogger.initializeTokenMap();

      // Act
      const result = tokenLogger.getTotalCost(tokenMap);

      // Assert
      expect(result).toBeNull();
    });

    it('should sum costs across all categories', () => {
      // Arrange
      const tokenMap: TokenMap = tokenLogger.initializeTokenMap();
      const usage1: TokenUsage = {
        model: 'openai/gpt-4o-mini',
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      };
      const usage2: TokenUsage = {
        model: 'openai/gpt-4.1-nano',
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      };
      tokenLogger.addTokenUsage(tokenMap, 'classifier', usage1);
      tokenLogger.addTokenUsage(tokenMap, 'expander', usage2);

      // Act
      const result = tokenLogger.getTotalCost(tokenMap);

      // Assert
      expect(result).not.toBeNull();
      expect(result).toBeCloseTo(1.25, 9); // 0.75 + 0.5
    });

    it('should handle multiple records in multiple categories', () => {
      // Arrange
      const tokenMap: TokenMap = tokenLogger.initializeTokenMap();
      const usage1: TokenUsage = {
        model: 'openai/gpt-4o-mini',
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      };
      const usage2: TokenUsage = {
        model: 'openai/gpt-4.1-nano',
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      };
      const usage3: TokenUsage = {
        model: 'openai/gpt-4.1-mini',
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      };
      tokenLogger.addTokenUsage(tokenMap, 'classifier', usage1);
      tokenLogger.addTokenUsage(tokenMap, 'classifier', usage2);
      tokenLogger.addTokenUsage(tokenMap, 'expander', usage3);

      // Act
      const result = tokenLogger.getTotalCost(tokenMap);

      // Assert
      expect(result).not.toBeNull();
      expect(result).toBeCloseTo(3.25, 9); // 0.75 + 0.5 + 2.0
    });

    it('should handle categories with zero cost', () => {
      // Arrange
      const tokenMap: TokenMap = tokenLogger.initializeTokenMap();
      const usage1: TokenUsage = {
        model: 'openai/gpt-4o-mini',
        inputTokens: 0,
        outputTokens: 0,
      };
      const usage2: TokenUsage = {
        model: 'unknown/model',
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      };
      tokenLogger.addTokenUsage(tokenMap, 'zero-cost', usage1);
      tokenLogger.addTokenUsage(tokenMap, 'unknown-model', usage2);

      // Act
      const result = tokenLogger.getTotalCost(tokenMap);

      // Assert
      expect(result).not.toBeNull();
      expect(result).toBe(0);
    });

    it('should handle mix of zero and non-zero cost categories', () => {
      // Arrange
      const tokenMap: TokenMap = tokenLogger.initializeTokenMap();
      const usage1: TokenUsage = {
        model: 'openai/gpt-4o-mini',
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      };
      const usage2: TokenUsage = {
        model: 'unknown/model',
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      };
      tokenLogger.addTokenUsage(tokenMap, 'known-model', usage1);
      tokenLogger.addTokenUsage(tokenMap, 'unknown-model', usage2);

      // Act
      const result = tokenLogger.getTotalCost(tokenMap);

      // Assert
      expect(result).toBeCloseTo(0.75, 9);
    });
  });

  describe('formatCost', () => {
    it('should format zero cost as $0.00', () => {
      // Arrange & Act
      const result = tokenLogger.formatCost(0);

      // Assert
      expect(result).toBe('$0.00');
    });

    it('should format small costs with 4 decimal places', () => {
      // Arrange & Act
      const result = tokenLogger.formatCost(0.00012345);

      // Assert
      expect(result).toBe('$0.0001');
    });

    it('should format medium costs with 4 decimal places', () => {
      // Arrange & Act
      const result = tokenLogger.formatCost(0.75);

      // Assert
      expect(result).toBe('$0.7500');
    });

    it('should format large costs with 4 decimal places', () => {
      // Arrange & Act
      const result = tokenLogger.formatCost(123.456789);

      // Assert
      expect(result).toBe('$123.4568');
    });

    it('should round to 4 decimal places', () => {
      // Arrange & Act
      const result = tokenLogger.formatCost(0.000123456);

      // Assert
      expect(result).toBe('$0.0001');
    });

    it('should handle very large costs', () => {
      // Arrange & Act
      const result = tokenLogger.formatCost(9999.999999);

      // Assert
      expect(result).toBe('$10000.0000');
    });

    it('should format costs exactly at 4 decimal places', () => {
      // Arrange & Act
      const result = tokenLogger.formatCost(0.1234);

      // Assert
      expect(result).toBe('$0.1234');
    });
  });

  describe('formatTokenCount', () => {
    it('should format small numbers as plain string', () => {
      // Arrange & Act
      const result = tokenLogger.formatTokenCount(123);

      // Assert
      expect(result).toBe('123');
    });

    it('should format thousands with K suffix', () => {
      // Arrange & Act
      const result = tokenLogger.formatTokenCount(1500);

      // Assert
      expect(result).toBe('1.50K');
    });

    it('should format thousands with exactly 1000 as 1.00K', () => {
      // Arrange & Act
      const result = tokenLogger.formatTokenCount(1000);

      // Assert
      expect(result).toBe('1.00K');
    });

    it('should format millions with M suffix', () => {
      // Arrange & Act
      const result = tokenLogger.formatTokenCount(1_500_000);

      // Assert
      expect(result).toBe('1.50M');
    });

    it('should format millions with exactly 1 million as 1.00M', () => {
      // Arrange & Act
      const result = tokenLogger.formatTokenCount(1_000_000);

      // Assert
      expect(result).toBe('1.00M');
    });

    it('should format very large numbers in millions', () => {
      // Arrange & Act
      const result = tokenLogger.formatTokenCount(10_500_000);

      // Assert
      expect(result).toBe('10.50M');
    });

    it('should format zero as 0', () => {
      // Arrange & Act
      const result = tokenLogger.formatTokenCount(0);

      // Assert
      expect(result).toBe('0');
    });

    it('should format numbers just below 1000 without suffix', () => {
      // Arrange & Act
      const result = tokenLogger.formatTokenCount(999);

      // Assert
      expect(result).toBe('999');
    });

    it('should format numbers just below 1 million with K suffix', () => {
      // Arrange & Act
      const result = tokenLogger.formatTokenCount(999_999);

      // Assert
      expect(result).toBe('1000.00K'); // 999999 / 1000 = 999.999K rounds to 1000.00K
    });

    it('should handle fractional token amounts', () => {
      // Arrange & Act
      const result = tokenLogger.formatTokenCount(123.456);

      // Assert
      expect(result).toBe('123.456');
    });
  });

  describe('getSummary', () => {
    it('should return summary with null totals for empty token map', () => {
      // Arrange
      const tokenMap: TokenMap = tokenLogger.initializeTokenMap();

      // Act
      const result = tokenLogger.getSummary(tokenMap);

      // Assert
      expect(result.totalTokens).toBeNull();
      expect(result.totalCost).toBeNull();
      expect(Object.keys(result.byCategory)).toHaveLength(0);
    });

    it('should return summary for single category with single record', () => {
      // Arrange
      const tokenMap: TokenMap = tokenLogger.initializeTokenMap();
      const usage: TokenUsage = {
        model: 'openai/gpt-4o-mini',
        inputTokens: 1000,
        outputTokens: 500,
      };
      tokenLogger.addTokenUsage(tokenMap, 'classifier', usage);

      // Act
      const result = tokenLogger.getSummary(tokenMap);

      // Assert
      expect(result.totalTokens).not.toBeNull();
      expect(result.totalTokens?.inputTokens).toBe(1000);
      expect(result.totalTokens?.outputTokens).toBe(500);
      expect(result.totalCost).not.toBeNull();
      expect(result.totalCost).toBeCloseTo(0.00045, 8);
      expect(Object.keys(result.byCategory)).toHaveLength(1);
      expect(result.byCategory['classifier']).toBeDefined();
      expect(result.byCategory['classifier'].tokenCount.inputTokens).toBe(1000);
      expect(result.byCategory['classifier'].tokenCount.outputTokens).toBe(500);
      expect(result.byCategory['classifier'].cost).toBeCloseTo(0.00045, 8);
      expect(result.byCategory['classifier'].recordCount).toBe(1);
    });

    it('should return summary for multiple categories with multiple records', () => {
      // Arrange
      const tokenMap: TokenMap = tokenLogger.initializeTokenMap();
      const usage1: TokenUsage = {
        model: 'openai/gpt-4o-mini',
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      };
      const usage2: TokenUsage = {
        model: 'openai/gpt-4.1-nano',
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      };
      const usage3: TokenUsage = {
        model: 'openai/gpt-4.1-mini',
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      };
      tokenLogger.addTokenUsage(tokenMap, 'classifier', usage1);
      tokenLogger.addTokenUsage(tokenMap, 'classifier', usage2);
      tokenLogger.addTokenUsage(tokenMap, 'expander', usage3);

      // Act
      const result = tokenLogger.getSummary(tokenMap);

      // Assert
      expect(result.totalTokens).not.toBeNull();
      expect(result.totalTokens?.inputTokens).toBe(3_000_000);
      expect(result.totalTokens?.outputTokens).toBe(3_000_000);
      expect(result.totalCost).not.toBeNull();
      expect(result.totalCost).toBeCloseTo(3.25, 9); // 0.75 + 0.5 + 2.0
      expect(Object.keys(result.byCategory)).toHaveLength(2);

      expect(result.byCategory['classifier']).toBeDefined();
      expect(result.byCategory['classifier'].tokenCount.inputTokens).toBe(
        2_000_000,
      );
      expect(result.byCategory['classifier'].tokenCount.outputTokens).toBe(
        2_000_000,
      );
      expect(result.byCategory['classifier'].cost).toBeCloseTo(1.25, 9);
      expect(result.byCategory['classifier'].recordCount).toBe(2);

      expect(result.byCategory['expander']).toBeDefined();
      expect(result.byCategory['expander'].tokenCount.inputTokens).toBe(
        1_000_000,
      );
      expect(result.byCategory['expander'].tokenCount.outputTokens).toBe(
        1_000_000,
      );
      expect(result.byCategory['expander'].cost).toBeCloseTo(2.0, 9);
      expect(result.byCategory['expander'].recordCount).toBe(1);
    });

    it('should handle categories with empty arrays', () => {
      // Arrange
      const tokenMap: TokenMap = {
        'empty-category': [],
      };

      // Act
      const result = tokenLogger.getSummary(tokenMap);

      // Assert
      expect(result.totalTokens).not.toBeNull();
      expect(result.totalTokens?.inputTokens).toBe(0);
      expect(result.totalTokens?.outputTokens).toBe(0);
      expect(result.totalCost).not.toBeNull();
      expect(result.totalCost).toBe(0);
      expect(Object.keys(result.byCategory)).toHaveLength(0);
    });

    it('should handle mix of populated and empty categories', () => {
      // Arrange
      const tokenMap: TokenMap = {
        'empty-category': [],
      };
      const usage: TokenUsage = {
        model: 'openai/gpt-4o-mini',
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      };
      tokenLogger.addTokenUsage(tokenMap, 'classifier', usage);

      // Act
      const result = tokenLogger.getSummary(tokenMap);

      // Assert
      expect(result.totalTokens).not.toBeNull();
      expect(result.totalTokens?.inputTokens).toBe(1_000_000);
      expect(result.totalTokens?.outputTokens).toBe(1_000_000);
      expect(result.totalCost).not.toBeNull();
      expect(result.totalCost).toBeCloseTo(0.75, 9);
      expect(Object.keys(result.byCategory)).toHaveLength(1);
      expect(result.byCategory['classifier']).toBeDefined();
      expect(Object.keys(result.byCategory)).not.toContain('empty-category');
    });

    it('should include all categories with data', () => {
      // Arrange
      const tokenMap: TokenMap = tokenLogger.initializeTokenMap();
      const usage1: TokenUsage = {
        model: 'openai/gpt-4o-mini',
        inputTokens: 1000,
        outputTokens: 500,
      };
      const usage2: TokenUsage = {
        model: 'openai/gpt-4.1-nano',
        inputTokens: 2000,
        outputTokens: 1000,
      };
      const usage3: TokenUsage = {
        model: 'openai/gpt-4.1-mini',
        inputTokens: 3000,
        outputTokens: 1500,
      };
      tokenLogger.addTokenUsage(tokenMap, 'classifier', usage1);
      tokenLogger.addTokenUsage(tokenMap, 'expander', usage2);
      tokenLogger.addTokenUsage(tokenMap, 'synthesis', usage3);

      // Act
      const result = tokenLogger.getSummary(tokenMap);

      // Assert
      expect(Object.keys(result.byCategory)).toHaveLength(3);
      expect(result.byCategory['classifier']).toBeDefined();
      expect(result.byCategory['expander']).toBeDefined();
      expect(result.byCategory['synthesis']).toBeDefined();
    });

    it('should correctly calculate record count per category', () => {
      // Arrange
      const tokenMap: TokenMap = tokenLogger.initializeTokenMap();
      const usage1: TokenUsage = {
        model: 'openai/gpt-4o-mini',
        inputTokens: 1000,
        outputTokens: 500,
      };
      const usage2: TokenUsage = {
        model: 'openai/gpt-4o-mini',
        inputTokens: 2000,
        outputTokens: 1000,
      };
      const usage3: TokenUsage = {
        model: 'openai/gpt-4.1-nano',
        inputTokens: 500,
        outputTokens: 250,
      };
      tokenLogger.addTokenUsage(tokenMap, 'classifier', usage1);
      tokenLogger.addTokenUsage(tokenMap, 'classifier', usage2);
      tokenLogger.addTokenUsage(tokenMap, 'classifier', usage3);
      tokenLogger.addTokenUsage(tokenMap, 'expander', usage1);

      // Act
      const result = tokenLogger.getSummary(tokenMap);

      // Assert
      expect(result.byCategory['classifier'].recordCount).toBe(3);
      expect(result.byCategory['expander'].recordCount).toBe(1);
    });
  });

  describe('integration scenarios', () => {
    it('should track complete query processing workflow', () => {
      // Arrange
      const tokenMap: TokenMap = tokenLogger.initializeTokenMap();

      // Question classification
      tokenLogger.addTokenUsage(tokenMap, 'question-classifier', {
        model: 'openai/gpt-4.1-nano',
        inputTokens: 500,
        outputTokens: 100,
      });

      // Skill expansion
      tokenLogger.addTokenUsage(tokenMap, 'skill-expander', {
        model: 'openai/gpt-4o-mini',
        inputTokens: 1000,
        outputTokens: 500,
      });

      // Course classification
      tokenLogger.addTokenUsage(tokenMap, 'course-classifier', {
        model: 'openai/gpt-4o-mini',
        inputTokens: 2000,
        outputTokens: 1000,
      });

      // Answer synthesis
      tokenLogger.addTokenUsage(tokenMap, 'answer-synthesis', {
        model: 'openai/gpt-4.1-mini',
        inputTokens: 5000,
        outputTokens: 2000,
      });

      // Act
      const summary = tokenLogger.getSummary(tokenMap);

      // Assert
      expect(summary.totalTokens).not.toBeNull();
      expect(summary.totalTokens?.inputTokens).toBe(8500);
      expect(summary.totalTokens?.outputTokens).toBe(3600);
      expect(summary.totalCost).toBeGreaterThan(0);
      expect(Object.keys(summary.byCategory)).toHaveLength(4);

      // Verify each category
      expect(summary.byCategory['question-classifier'].recordCount).toBe(1);
      expect(summary.byCategory['skill-expander'].recordCount).toBe(1);
      expect(summary.byCategory['course-classifier'].recordCount).toBe(1);
      expect(summary.byCategory['answer-synthesis'].recordCount).toBe(1);
    });

    it('should handle batch processing with multiple records per category', () => {
      // Arrange
      const tokenMap: TokenMap = tokenLogger.initializeTokenMap();

      // Simulate batch processing of 10 questions
      for (let i = 0; i < 10; i++) {
        tokenLogger.addTokenUsage(tokenMap, 'batch-classifier', {
          model: 'openai/gpt-4.1-nano',
          inputTokens: 500,
          outputTokens: 100,
        });
      }

      // Act
      const summary = tokenLogger.getSummary(tokenMap);

      // Assert
      expect(summary.totalTokens?.inputTokens).toBe(5000); // 10 * 500
      expect(summary.totalTokens?.outputTokens).toBe(1000); // 10 * 100
      expect(summary.byCategory['batch-classifier'].recordCount).toBe(10);
      expect(
        summary.byCategory['batch-classifier'].tokenCount.inputTokens,
      ).toBe(5000);
      expect(
        summary.byCategory['batch-classifier'].tokenCount.outputTokens,
      ).toBe(1000);
    });

    it('should handle mixed model usage across categories', () => {
      // Arrange
      const tokenMap: TokenMap = tokenLogger.initializeTokenMap();

      tokenLogger.addTokenUsage(tokenMap, 'category1', {
        model: 'openai/gpt-4o-mini',
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      });

      tokenLogger.addTokenUsage(tokenMap, 'category2', {
        model: 'openai/gpt-4.1-nano',
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      });

      tokenLogger.addTokenUsage(tokenMap, 'category3', {
        model: 'openai/gpt-4.1-mini',
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      });

      tokenLogger.addTokenUsage(tokenMap, 'category4', {
        model: 'google/gemini-2.5-flash',
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      });

      // Act
      const summary = tokenLogger.getSummary(tokenMap);

      // Assert
      expect(summary.totalCost).toBeCloseTo(6.05, 9); // 0.75 + 0.5 + 2.0 + 2.8
      expect(Object.keys(summary.byCategory)).toHaveLength(4);

      // Verify individual category costs
      expect(summary.byCategory['category1'].cost).toBeCloseTo(0.75, 9);
      expect(summary.byCategory['category2'].cost).toBeCloseTo(0.5, 9);
      expect(summary.byCategory['category3'].cost).toBeCloseTo(2.0, 9);
      expect(summary.byCategory['category4'].cost).toBeCloseTo(2.8, 9);
    });
  });
});
