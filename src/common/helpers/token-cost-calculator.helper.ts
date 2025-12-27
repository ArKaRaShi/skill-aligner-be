import { LLM_MODEL_REGISTRATIONS } from 'src/core/llm/models';

import { TokenUsage } from 'src/common/types/token-usage.type';

export type TokenCostEstimate = TokenUsage & {
  available: boolean; // true if cost data is available for this model and token type
  estimatedCost: number; // 0 if not available
};

export type TokenCostEstimateSummary = {
  totalEstimatedCost: number;
  details: TokenCostEstimate[];
};

export class TokenCostCalculator {
  private static readonly AVAILABLE_ESTIMATIONS = LLM_MODEL_REGISTRATIONS;

  static estimateCost({
    inputTokens,
    outputTokens,
    model,
  }: TokenUsage): TokenCostEstimate {
    // Find cost data by searching through all model mappings
    const modelEstimations = this.AVAILABLE_ESTIMATIONS.find(
      (mapping) => mapping.modelId === model,
    );

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
      modelEstimations.cost.inputCostPerMillionTokens;
    const outputCost =
      (normalizedOutputTokens / 1_000_000) *
      modelEstimations.cost.outputCostPerMillionTokens;
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
