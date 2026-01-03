import { TokenUsage } from 'src/shared/domain/types/token-usage.type';

import {
  TokenCostCalculator,
  TokenCostEstimate,
} from './token-cost-calculator.helper';

export interface TokenRecord {
  usage: TokenUsage;
  costEstimate: TokenCostEstimate;
}

export interface TokenMap {
  [key: string]: TokenRecord[];
}

export class TokenLogger {
  initializeTokenMap(): TokenMap {
    return {};
  }

  addTokenUsage(tokenMap: TokenMap, key: string, usage: TokenUsage): void {
    if (!tokenMap[key]) {
      tokenMap[key] = [];
    }
    const costEstimate = TokenCostCalculator.estimateCost(usage);
    tokenMap[key].push({
      usage,
      costEstimate,
    });
  }

  getTotalTokensForCategory(
    tokenMap: TokenMap,
    key: string,
  ): { inputTokens: number; outputTokens: number } | null {
    const records = tokenMap[key];
    if (!records || records.length === 0) {
      return null;
    }

    const totalInputTokens = records.reduce(
      (sum, record) => sum + record.usage.inputTokens,
      0,
    );
    const totalOutputTokens = records.reduce(
      (sum, record) => sum + record.usage.outputTokens,
      0,
    );

    return {
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
    };
  }

  getTotalCostForCategory(tokenMap: TokenMap, key: string): number | null {
    const records = tokenMap[key];
    if (!records || records.length === 0) {
      return null;
    }

    return records.reduce(
      (sum, record) => sum + record.costEstimate.estimatedCost,
      0,
    );
  }

  getTotalTokens(
    tokenMap: TokenMap,
  ): { inputTokens: number; outputTokens: number } | null {
    const keys = Object.keys(tokenMap);
    if (keys.length === 0) {
      return null;
    }

    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    for (const key of keys) {
      const categoryTotals = this.getTotalTokensForCategory(tokenMap, key);
      if (categoryTotals) {
        totalInputTokens += categoryTotals.inputTokens;
        totalOutputTokens += categoryTotals.outputTokens;
      }
    }

    return {
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
    };
  }

  getTotalCost(tokenMap: TokenMap): number | null {
    const keys = Object.keys(tokenMap);
    if (keys.length === 0) {
      return null;
    }

    let totalCost = 0;
    for (const key of keys) {
      const categoryCost = this.getTotalCostForCategory(tokenMap, key);
      if (categoryCost !== null) {
        totalCost += categoryCost;
      }
    }

    return totalCost;
  }

  formatCost(cost: number): string {
    if (cost === 0) return '$0.00';
    return `$${cost.toFixed(4)}`;
  }

  formatTokenCount(count: number): string {
    if (count >= 1_000_000) {
      return `${(count / 1_000_000).toFixed(2)}M`;
    }
    if (count >= 1_000) {
      return `${(count / 1_000).toFixed(2)}K`;
    }
    return count.toString();
  }

  getSummary(tokenMap: TokenMap): {
    totalTokens: { inputTokens: number; outputTokens: number } | null;
    totalCost: number | null;
    byCategory: {
      [key: string]: {
        tokenCount: { inputTokens: number; outputTokens: number };
        cost: number;
        recordCount: number;
      };
    };
  } {
    const byCategory: {
      [key: string]: {
        tokenCount: { inputTokens: number; outputTokens: number };
        cost: number;
        recordCount: number;
      };
    } = {};

    for (const key of Object.keys(tokenMap)) {
      const records = tokenMap[key];
      const tokenCount = this.getTotalTokensForCategory(tokenMap, key);
      const cost = this.getTotalCostForCategory(tokenMap, key);

      if (tokenCount && cost !== null) {
        byCategory[key] = {
          tokenCount,
          cost,
          recordCount: records.length,
        };
      }
    }

    return {
      totalTokens: this.getTotalTokens(tokenMap),
      totalCost: this.getTotalCost(tokenMap),
      byCategory,
    };
  }
}
