type TokenCostEstimateInput = {
  tokenCount: number;
  tokenType: 'input' | 'output';
  model: string;
};

type TokenCostEstimate = {
  tokenCount: number;
  tokenType: 'input' | 'output';
  model: string;
  available: boolean; // true if cost data is available for this model and token type
  estimatedCost: number; // 0 if not available
};

type TokenCostEstimateSummary = {
  totalEstimatedCost: number;
  details: TokenCostEstimate[];
};

type TokenCostRatesByModel = {
  [model: string]: {
    inputCostPerMillionTokens: number; // cost per million input tokens
    outputCostPerMillionTokens: number; // cost per million output tokens
  };
};

export class TokenCostCalculatorService {
  private static readonly AVAILABLE_ESTIMATIONS: TokenCostRatesByModel = {
    'gpt-4o-mini': {
      inputCostPerMillionTokens: 0.15, // $0.15 per 1,000,000 tokens
      outputCostPerMillionTokens: 0.6, // $0.6 per 1,000,000 tokens
    },
    'gpt-4.1-mini': {
      inputCostPerMillionTokens: 0.4, // $0.4 per 1,000,000 tokens
      outputCostPerMillionTokens: 1.6, // $1.6 per 1,000,000 tokens
    },
  };

  static estimateCost({
    tokenCount,
    tokenType,
    model,
  }: TokenCostEstimateInput): TokenCostEstimate {
    const modelEstimations = this.AVAILABLE_ESTIMATIONS[model];
    if (!modelEstimations) {
      return {
        tokenCount,
        tokenType,
        model,
        available: false,
        estimatedCost: 0,
      };
    }

    const costPerMillionTokens =
      tokenType === 'input'
        ? modelEstimations.inputCostPerMillionTokens
        : modelEstimations.outputCostPerMillionTokens;

    const estimatedCost = (tokenCount / 1_000_000) * costPerMillionTokens;

    return {
      tokenCount,
      tokenType,
      model,
      available: true,
      estimatedCost,
    };
  }

  static estimateTotalCost(
    estimations: TokenCostEstimateInput[],
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
