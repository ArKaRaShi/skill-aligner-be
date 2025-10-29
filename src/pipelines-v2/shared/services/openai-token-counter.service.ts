import { encoding_for_model, TiktokenModel } from '@dqbd/tiktoken';

export class OpenAITokenCounterService {
  private static readonly inputPricing: Partial<Record<TiktokenModel, number>> =
    {
      'gpt-4.1-mini': 0.4, // $0.40 per 1M tokens
    };
  private static readonly outputPricing: Partial<
    Record<TiktokenModel, number>
  > = {
    'gpt-4.1-mini': 1.6, // $1.60 per 1M tokens
  };

  /**
   * Count tokens in the given text for the specified model
   * @param text - The text to count tokens for
   * @param model - The model to use for tokenization
   * @returns The number of tokens in the text
   */
  static countTokens({
    text,
    model,
  }: {
    text: string;
    model: TiktokenModel;
  }): number {
    const enc = encoding_for_model(model);
    const tokens = enc.encode(text);
    const tokenCount = tokens.length;
    enc.free();
    return tokenCount;
  }

  /**
   * Estimate cost (in USD) for a given token count and model pricing.
   * @param tokenCount number of tokens
   * @param model model name
   * @param mode 'input' or 'output' tokens
   * @returns estimated cost in USD
   */
  static estimateCost({
    tokenCount,
    model,
    mode = 'input',
  }: {
    tokenCount: number;
    model: TiktokenModel;
    mode: 'input' | 'output';
  }): number {
    const pricingRecord =
      mode === 'input' ? this.inputPricing[model] : this.outputPricing[model];
    if (!pricingRecord) {
      throw new Error(`Unknown model: ${model}`);
    }
    const costPerM = pricingRecord; // cost per million tokens
    const costPerToken = costPerM / 1_000_000;
    return tokenCount * costPerToken;
  }
}
