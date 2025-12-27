import { TokenUsage } from 'src/common/types/token-usage.type';

export type TokenCostEstimate = TokenUsage & {
  available: boolean; // true if cost data is available for this model and token type
  estimatedCost: number; // 0 if not available
};

export type TokenCostEstimateSummary = {
  totalEstimatedCost: number;
  details: TokenCostEstimate[];
};

type TokenCostRatesByModel = {
  [model: string]: {
    inputCostPerMillionTokens: number; // cost per million input tokens
    outputCostPerMillionTokens: number; // cost per million output tokens
  };
};

export class TokenCostCalculator {
  private static readonly AVAILABLE_ESTIMATIONS: TokenCostRatesByModel = {
    'openai/gpt-4o-mini': {
      inputCostPerMillionTokens: 0.15, // $0.15 per 1,000,000 tokens
      outputCostPerMillionTokens: 0.6, // $0.6 per 1,000,000 tokens
    },
    'openai/gpt-4.1-mini': {
      inputCostPerMillionTokens: 0.4, // $0.4 per 1,000,000 tokens
      outputCostPerMillionTokens: 1.6, // $1.6 per 1,000,000 tokens
    },
    'openai/gpt-4.1-nano': {
      inputCostPerMillionTokens: 0.1, // $0.1 per 1,000,000 tokens
      outputCostPerMillionTokens: 0.4, // $0.4 per 1,000,000 tokens
    },
    'openai/gpt-oss-120b': {
      inputCostPerMillionTokens: 0.039, // $0.039 per 1,000,000 tokens
      outputCostPerMillionTokens: 0.19, // $0.19 per 1,000,000 tokens
    },
    'google/gemini-2.5-flash': {
      inputCostPerMillionTokens: 0.3, // $0.3 per 1,000,000 tokens
      outputCostPerMillionTokens: 2.5, // $2.5 per 1,000,000 tokens
    },
    'google/gemini-2.0-flash-001': {
      inputCostPerMillionTokens: 0.1, // $0.1 per 1,000,000 tokens
      outputCostPerMillionTokens: 0.4, // $0.4 per 1,000,000 tokens
    },
  };

  static estimateCost({
    inputTokens,
    outputTokens,
    model,
  }: TokenUsage): TokenCostEstimate {
    const modelEstimations = this.AVAILABLE_ESTIMATIONS[model];
    if (!modelEstimations) {
      return {
        inputTokens,
        outputTokens,
        model,
        available: false,
        estimatedCost: 0,
      };
    }

    // Treat negative token amounts as zero
    const normalizedInputTokens = Math.max(0, inputTokens);
    const normalizedOutputTokens = Math.max(0, outputTokens);

    const inputCost =
      (normalizedInputTokens / 1_000_000) *
      modelEstimations.inputCostPerMillionTokens;
    const outputCost =
      (normalizedOutputTokens / 1_000_000) *
      modelEstimations.outputCostPerMillionTokens;
    const estimatedCost = inputCost + outputCost;

    return {
      inputTokens,
      outputTokens,
      model,
      available: true,
      estimatedCost,
    };
  }

  static estimateTotalCost(
    estimations: TokenUsage[],
  ): TokenCostEstimateSummary {
    const details: TokenCostEstimate[] = estimations.map((estimation) =>
      this.estimateCost(estimation),
    );

    const totalEstimatedCost = details.reduce(
      (total, detail) => total + detail.estimatedCost,
      0,
    );

    return {
      totalEstimatedCost,
      details,
    };
  }
}
