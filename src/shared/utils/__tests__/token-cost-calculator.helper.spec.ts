import { TokenUsage } from '../../contracts/types/token-usage.type';
import { TokenCostCalculator } from '../token-cost-calculator.helper';

describe('TokenCostCalculator', () => {
  describe('estimateCost', () => {
    describe('with known models', () => {
      it('should estimate cost for openai/gpt-4o-mini correctly', () => {
        const usage: TokenUsage = {
          model: 'openai/gpt-4o-mini',
          inputTokens: 1_000_000,
          outputTokens: 1_000_000,
        };

        const result = TokenCostCalculator.estimateCost(usage);

        expect(result).toEqual({
          model: 'openai/gpt-4o-mini',
          inputTokens: 1_000_000,
          outputTokens: 1_000_000,
          available: true,
          estimatedCost: 0.75, // 0.15 + 0.6
        });
      });

      it('should estimate cost for openai/gpt-4.1-mini correctly', () => {
        const usage: TokenUsage = {
          model: 'openai/gpt-4.1-mini',
          inputTokens: 1_000_000,
          outputTokens: 1_000_000,
        };

        const result = TokenCostCalculator.estimateCost(usage);

        expect(result).toEqual({
          model: 'openai/gpt-4.1-mini',
          inputTokens: 1_000_000,
          outputTokens: 1_000_000,
          available: true,
          estimatedCost: 2.0, // 0.4 + 1.6
        });
      });

      it('should estimate cost for openai/gpt-4.1-nano correctly', () => {
        const usage: TokenUsage = {
          model: 'openai/gpt-4.1-nano',
          inputTokens: 1_000_000,
          outputTokens: 1_000_000,
        };

        const result = TokenCostCalculator.estimateCost(usage);

        expect(result).toEqual({
          model: 'openai/gpt-4.1-nano',
          inputTokens: 1_000_000,
          outputTokens: 1_000_000,
          available: true,
          estimatedCost: 0.5, // 0.1 + 0.4
        });
      });

      it('should estimate cost for google/gemini-2.5-flash correctly', () => {
        const usage: TokenUsage = {
          model: 'google/gemini-2.5-flash',
          inputTokens: 1_000_000,
          outputTokens: 1_000_000,
        };

        const result = TokenCostCalculator.estimateCost(usage);

        expect(result).toEqual({
          model: 'google/gemini-2.5-flash',
          inputTokens: 1_000_000,
          outputTokens: 1_000_000,
          available: true,
          estimatedCost: 2.8, // 0.3 + 2.5
        });
      });

      it('should calculate cost for partial token amounts', () => {
        const usage: TokenUsage = {
          model: 'openai/gpt-4o-mini',
          inputTokens: 500_000,
          outputTokens: 250_000,
        };

        const result = TokenCostCalculator.estimateCost(usage);

        expect(result.model).toBe('openai/gpt-4o-mini');
        expect(result.inputTokens).toBe(500_000);
        expect(result.outputTokens).toBe(250_000);
        expect(result.available).toBe(true);
        expect(result.estimatedCost).toBeCloseTo(0.225, 9); // (500k/1M * 0.15) + (250k/1M * 0.6) = 0.075 + 0.15
      });

      it('should handle zero tokens', () => {
        const usage: TokenUsage = {
          model: 'openai/gpt-4o-mini',
          inputTokens: 0,
          outputTokens: 0,
        };

        const result = TokenCostCalculator.estimateCost(usage);

        expect(result).toEqual({
          model: 'openai/gpt-4o-mini',
          inputTokens: 0,
          outputTokens: 0,
          available: true,
          estimatedCost: 0,
        });
      });

      it('should handle only input tokens', () => {
        const usage: TokenUsage = {
          model: 'openai/gpt-4.1-mini',
          inputTokens: 1_000_000,
          outputTokens: 0,
        };

        const result = TokenCostCalculator.estimateCost(usage);

        expect(result).toEqual({
          model: 'openai/gpt-4.1-mini',
          inputTokens: 1_000_000,
          outputTokens: 0,
          available: true,
          estimatedCost: 0.4, // 0.4 + 0
        });
      });

      it('should handle only output tokens', () => {
        const usage: TokenUsage = {
          model: 'openai/gpt-4.1-mini',
          inputTokens: 0,
          outputTokens: 1_000_000,
        };

        const result = TokenCostCalculator.estimateCost(usage);

        expect(result).toEqual({
          model: 'openai/gpt-4.1-mini',
          inputTokens: 0,
          outputTokens: 1_000_000,
          available: true,
          estimatedCost: 1.6, // 0 + 1.6
        });
      });

      it('should handle small token amounts correctly', () => {
        const usage: TokenUsage = {
          model: 'openai/gpt-4o-mini',
          inputTokens: 100,
          outputTokens: 50,
        };

        const result = TokenCostCalculator.estimateCost(usage);

        expect(result).toEqual({
          model: 'openai/gpt-4o-mini',
          inputTokens: 100,
          outputTokens: 50,
          available: true,
          estimatedCost: 0.000045, // (100/1M * 0.15) + (50/1M * 0.6) = 0.000015 + 0.00003
        });
      });

      it('should handle large token amounts correctly', () => {
        const usage: TokenUsage = {
          model: 'google/gemini-2.5-flash',
          inputTokens: 10_000_000,
          outputTokens: 5_000_000,
        };

        const result = TokenCostCalculator.estimateCost(usage);

        expect(result).toEqual({
          model: 'google/gemini-2.5-flash',
          inputTokens: 10_000_000,
          outputTokens: 5_000_000,
          available: true,
          estimatedCost: 15.5, // (10M/1M * 0.3) + (5M/1M * 2.5) = 3 + 12.5
        });
      });
    });

    describe('with unknown models', () => {
      it('should return unavailable estimate for unknown model', () => {
        const usage: TokenUsage = {
          model: 'unknown/model',
          inputTokens: 1_000_000,
          outputTokens: 1_000_000,
        };

        const result = TokenCostCalculator.estimateCost(usage);

        expect(result).toEqual({
          model: 'unknown/model',
          inputTokens: 1_000_000,
          outputTokens: 1_000_000,
          available: false,
          estimatedCost: 0,
        });
      });

      it('should return unavailable estimate for empty model name', () => {
        const usage: TokenUsage = {
          model: '',
          inputTokens: 1_000_000,
          outputTokens: 1_000_000,
        };

        const result = TokenCostCalculator.estimateCost(usage);

        expect(result).toEqual({
          model: '',
          inputTokens: 1_000_000,
          outputTokens: 1_000_000,
          available: false,
          estimatedCost: 0,
        });
      });

      it('should preserve token counts even for unknown models', () => {
        const usage: TokenUsage = {
          model: 'non-existent-model',
          inputTokens: 500_000,
          outputTokens: 250_000,
        };

        const result = TokenCostCalculator.estimateCost(usage);

        expect(result.inputTokens).toBe(500_000);
        expect(result.outputTokens).toBe(250_000);
        expect(result.available).toBe(false);
        expect(result.estimatedCost).toBe(0);
      });
    });

    describe('edge cases', () => {
      it('should handle fractional token amounts', () => {
        const usage: TokenUsage = {
          model: 'openai/gpt-4o-mini',
          inputTokens: 1.5,
          outputTokens: 2.5,
        };

        const result = TokenCostCalculator.estimateCost(usage);

        expect(result.estimatedCost).toBeCloseTo(0.000001725, 9);
        expect(result.available).toBe(true);
      });

      it('should handle negative token amounts (treat as zero cost)', () => {
        const usage: TokenUsage = {
          model: 'openai/gpt-4o-mini',
          inputTokens: -1000,
          outputTokens: -500,
        };

        const result = TokenCostCalculator.estimateCost(usage);

        expect(result.estimatedCost).toBe(0);
        expect(result.available).toBe(true);
      });

      it('should handle very large numbers', () => {
        const usage: TokenUsage = {
          model: 'openai/gpt-4o-mini',
          inputTokens: Number.MAX_SAFE_INTEGER,
          outputTokens: Number.MAX_SAFE_INTEGER,
        };

        const result = TokenCostCalculator.estimateCost(usage);

        expect(result.available).toBe(true);
        expect(result.estimatedCost).toBeGreaterThan(0);
        expect(result.estimatedCost).toBeLessThan(Infinity);
      });
    });

    describe('model-specific pricing verification', () => {
      it('should verify gpt-4o-mini pricing: $0.15 input / $0.6 output per million', () => {
        const usage: TokenUsage = {
          model: 'openai/gpt-4o-mini',
          inputTokens: 1_000_000,
          outputTokens: 1_000_000,
        };

        const result = TokenCostCalculator.estimateCost(usage);

        expect(result.estimatedCost).toBe(0.75);
      });

      it('should verify gpt-4.1-mini pricing: $0.4 input / $1.6 output per million', () => {
        const usage: TokenUsage = {
          model: 'openai/gpt-4.1-mini',
          inputTokens: 1_000_000,
          outputTokens: 1_000_000,
        };

        const result = TokenCostCalculator.estimateCost(usage);

        expect(result.estimatedCost).toBe(2.0);
      });

      it('should verify gpt-4.1-nano pricing: $0.1 input / $0.4 output per million', () => {
        const usage: TokenUsage = {
          model: 'openai/gpt-4.1-nano',
          inputTokens: 1_000_000,
          outputTokens: 1_000_000,
        };

        const result = TokenCostCalculator.estimateCost(usage);

        expect(result.estimatedCost).toBe(0.5);
      });

      it('should verify gemini-2.5-flash pricing: $0.3 input / $2.5 output per million', () => {
        const usage: TokenUsage = {
          model: 'google/gemini-2.5-flash',
          inputTokens: 1_000_000,
          outputTokens: 1_000_000,
        };

        const result = TokenCostCalculator.estimateCost(usage);

        expect(result.estimatedCost).toBe(2.8);
      });
    });
  });

  describe('estimateTotalCost', () => {
    it('should calculate total cost for multiple estimations', () => {
      const estimations: TokenUsage[] = [
        {
          model: 'openai/gpt-4o-mini',
          inputTokens: 1_000_000,
          outputTokens: 1_000_000,
        },
        {
          model: 'openai/gpt-4.1-mini',
          inputTokens: 1_000_000,
          outputTokens: 1_000_000,
        },
      ];

      const result = TokenCostCalculator.estimateTotalCost(estimations);

      expect(result.totalEstimatedCost).toBe(2.75); // 0.75 + 2.0
      expect(result.details).toHaveLength(2);
      expect(result.details[0].estimatedCost).toBe(0.75);
      expect(result.details[1].estimatedCost).toBe(2.0);
    });

    it('should handle empty array of estimations', () => {
      const estimations: TokenUsage[] = [];

      const result = TokenCostCalculator.estimateTotalCost(estimations);

      expect(result.totalEstimatedCost).toBe(0);
      expect(result.details).toHaveLength(0);
    });

    it('should handle single estimation', () => {
      const estimations: TokenUsage[] = [
        {
          model: 'openai/gpt-4o-mini',
          inputTokens: 1_000_000,
          outputTokens: 1_000_000,
        },
      ];

      const result = TokenCostCalculator.estimateTotalCost(estimations);

      expect(result.totalEstimatedCost).toBe(0.75);
      expect(result.details).toHaveLength(1);
    });

    it('should include unknown models in total (with zero cost)', () => {
      const estimations: TokenUsage[] = [
        {
          model: 'openai/gpt-4o-mini',
          inputTokens: 1_000_000,
          outputTokens: 1_000_000,
        },
        {
          model: 'unknown/model',
          inputTokens: 1_000_000,
          outputTokens: 1_000_000,
        },
      ];

      const result = TokenCostCalculator.estimateTotalCost(estimations);

      expect(result.totalEstimatedCost).toBe(0.75);
      expect(result.details).toHaveLength(2);
      expect(result.details[0].available).toBe(true);
      expect(result.details[1].available).toBe(false);
    });

    it('should preserve all details in the response', () => {
      const estimations: TokenUsage[] = [
        {
          model: 'openai/gpt-4o-mini',
          inputTokens: 500_000,
          outputTokens: 250_000,
        },
        {
          model: 'openai/gpt-4.1-nano',
          inputTokens: 1_000_000,
          outputTokens: 500_000,
        },
      ];

      const result = TokenCostCalculator.estimateTotalCost(estimations);

      expect(result.details[0].model).toBe('openai/gpt-4o-mini');
      expect(result.details[0].inputTokens).toBe(500_000);
      expect(result.details[0].outputTokens).toBe(250_000);
      expect(result.details[0].available).toBe(true);
      expect(result.details[0].estimatedCost).toBeCloseTo(0.225, 9);

      expect(result.details[1].model).toBe('openai/gpt-4.1-nano');
      expect(result.details[1].inputTokens).toBe(1_000_000);
      expect(result.details[1].outputTokens).toBe(500_000);
      expect(result.details[1].available).toBe(true);
      expect(result.details[1].estimatedCost).toBeCloseTo(0.3, 9);

      expect(result.totalEstimatedCost).toBeCloseTo(0.525, 9);
    });

    it('should calculate total for mixed models correctly', () => {
      const estimations: TokenUsage[] = [
        {
          model: 'openai/gpt-4o-mini',
          inputTokens: 2_000_000,
          outputTokens: 1_000_000,
        },
        {
          model: 'openai/gpt-4.1-mini',
          inputTokens: 1_000_000,
          outputTokens: 2_000_000,
        },
        {
          model: 'google/gemini-2.5-flash',
          inputTokens: 500_000,
          outputTokens: 500_000,
        },
      ];

      const result = TokenCostCalculator.estimateTotalCost(estimations);

      // gpt-4o-mini: (2M * 0.15) + (1M * 0.6) = 0.3 + 0.6 = 0.9
      // gpt-4.1-mini: (1M * 0.4) + (2M * 1.6) = 0.4 + 3.2 = 3.6
      // gemini-2.5-flash: (0.5M * 0.3) + (0.5M * 2.5) = 0.15 + 1.25 = 1.4
      // Total: 0.9 + 3.6 + 1.4 = 5.9
      expect(result.totalEstimatedCost).toBe(5.9);
      expect(result.details).toHaveLength(3);
    });

    it('should handle estimations with zero tokens', () => {
      const estimations: TokenUsage[] = [
        {
          model: 'openai/gpt-4o-mini',
          inputTokens: 0,
          outputTokens: 0,
        },
        {
          model: 'openai/gpt-4.1-mini',
          inputTokens: 1_000_000,
          outputTokens: 1_000_000,
        },
      ];

      const result = TokenCostCalculator.estimateTotalCost(estimations);

      expect(result.totalEstimatedCost).toBe(2.0);
      expect(result.details[0].estimatedCost).toBe(0);
      expect(result.details[1].estimatedCost).toBe(2.0);
    });

    it('should handle all unknown models', () => {
      const estimations: TokenUsage[] = [
        {
          model: 'unknown/model-1',
          inputTokens: 1_000_000,
          outputTokens: 1_000_000,
        },
        {
          model: 'unknown/model-2',
          inputTokens: 1_000_000,
          outputTokens: 1_000_000,
        },
      ];

      const result = TokenCostCalculator.estimateTotalCost(estimations);

      expect(result.totalEstimatedCost).toBe(0);
      expect(result.details).toHaveLength(2);
      expect(result.details.every((detail) => detail.available === false)).toBe(
        true,
      );
    });

    it('should handle large number of estimations', () => {
      const estimations: TokenUsage[] = Array.from({ length: 100 }, () => ({
        model: 'openai/gpt-4o-mini',
        inputTokens: 10_000,
        outputTokens: 5_000,
      }));

      const result = TokenCostCalculator.estimateTotalCost(estimations);

      // Each: (10k/1M * 0.15) + (5k/1M * 0.6) = 0.0015 + 0.003 = 0.0045
      // Total: 100 * 0.0045 = 0.45
      expect(result.totalEstimatedCost).toBeCloseTo(0.45, 5);
      expect(result.details).toHaveLength(100);
    });
  });

  describe('integration scenarios', () => {
    it('should handle typical question classification scenario', () => {
      const estimations: TokenUsage[] = [
        {
          model: 'openai/gpt-4.1-nano',
          inputTokens: 500,
          outputTokens: 100,
        },
      ];

      const result = TokenCostCalculator.estimateTotalCost(estimations);

      // (500/1M * 0.1) + (100/1M * 0.4) = 0.00005 + 0.00004 = 0.00009
      expect(result.totalEstimatedCost).toBeCloseTo(0.00009, 8);
    });

    it('should handle skill expansion scenario', () => {
      const estimations: TokenUsage[] = [
        {
          model: 'openai/gpt-4o-mini',
          inputTokens: 1000,
          outputTokens: 500,
        },
      ];

      const result = TokenCostCalculator.estimateTotalCost(estimations);

      // (1000/1M * 0.15) + (500/1M * 0.6) = 0.00015 + 0.0003 = 0.00045
      expect(result.totalEstimatedCost).toBeCloseTo(0.00045, 8);
    });

    it('should handle course classification scenario', () => {
      const estimations: TokenUsage[] = [
        {
          model: 'openai/gpt-4o-mini',
          inputTokens: 2000,
          outputTokens: 1000,
        },
      ];

      const result = TokenCostCalculator.estimateTotalCost(estimations);

      // (2000/1M * 0.15) + (1000/1M * 0.6) = 0.0003 + 0.0006 = 0.0009
      expect(result.totalEstimatedCost).toBeCloseTo(0.0009, 8);
    });

    it('should handle answer generation scenario', () => {
      const estimations: TokenUsage[] = [
        {
          model: 'openai/gpt-4.1-mini',
          inputTokens: 5000,
          outputTokens: 2000,
        },
      ];

      const result = TokenCostCalculator.estimateTotalCost(estimations);

      // (5000/1M * 0.4) + (2000/1M * 1.6) = 0.002 + 0.0032 = 0.0052
      expect(result.totalEstimatedCost).toBeCloseTo(0.0052, 8);
    });

    it('should handle complex multi-step query processing', () => {
      const estimations: TokenUsage[] = [
        {
          model: 'openai/gpt-4.1-nano',
          inputTokens: 500,
          outputTokens: 100,
        }, // Question classifier
        {
          model: 'openai/gpt-4o-mini',
          inputTokens: 1000,
          outputTokens: 500,
        }, // Query profile builder
        {
          model: 'openai/gpt-4o-mini',
          inputTokens: 2000,
          outputTokens: 1000,
        }, // Skill expander
        {
          model: 'openai/gpt-4.1-nano',
          inputTokens: 3000,
          outputTokens: 500,
        }, // Filter LO
        {
          model: 'openai/gpt-4o-mini',
          inputTokens: 4000,
          outputTokens: 2000,
        }, // Course relevance filter
        {
          model: 'openai/gpt-4o-mini',
          inputTokens: 5000,
          outputTokens: 2500,
        }, // Course classification
        {
          model: 'openai/gpt-4o-mini',
          inputTokens: 6000,
          outputTokens: 3000,
        }, // Answer synthesis
        {
          model: 'openai/gpt-4.1-mini',
          inputTokens: 7000,
          outputTokens: 3500,
        }, // Answer generator
      ];

      const result = TokenCostCalculator.estimateTotalCost(estimations);

      expect(result.totalEstimatedCost).toBeGreaterThan(0);
      expect(result.details).toHaveLength(8);
      expect(result.details.every((detail) => detail.available === true)).toBe(
        true,
      );
    });
  });

  describe('cost comparison scenarios', () => {
    it('should compare costs between different models', () => {
      const gpt4oMini = TokenCostCalculator.estimateCost({
        model: 'openai/gpt-4o-mini',
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      });

      const gpt41Mini = TokenCostCalculator.estimateCost({
        model: 'openai/gpt-4.1-mini',
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      });

      const gpt41Nano = TokenCostCalculator.estimateCost({
        model: 'openai/gpt-4.1-nano',
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      });

      expect(gpt41Nano.estimatedCost).toBeLessThan(gpt4oMini.estimatedCost);
      expect(gpt4oMini.estimatedCost).toBeLessThan(gpt41Mini.estimatedCost);
    });

    it('should identify most cost-effective model for input-heavy tasks', () => {
      const inputHeavyUsage: TokenUsage = {
        model: 'openai/gpt-4.1-nano',
        inputTokens: 10_000_000,
        outputTokens: 100_000,
      };

      const result = TokenCostCalculator.estimateCost(inputHeavyUsage);

      // (10M/1M * 0.1) + (100k/1M * 0.4) = 1 + 0.04 = 1.04
      expect(result.estimatedCost).toBeCloseTo(1.04, 2);
    });

    it('should identify most cost-effective model for output-heavy tasks', () => {
      const outputHeavyUsage: TokenUsage = {
        model: 'openai/gpt-4.1-nano',
        inputTokens: 100_000,
        outputTokens: 10_000_000,
      };

      const result = TokenCostCalculator.estimateCost(outputHeavyUsage);

      // (100k/1M * 0.1) + (10M/1M * 0.4) = 0.01 + 4 = 4.01
      expect(result.estimatedCost).toBeCloseTo(4.01, 2);
    });
  });
});
