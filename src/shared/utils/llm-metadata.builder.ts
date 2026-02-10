import { LlmInfo } from 'src/shared/contracts/types/llm-info.type';
import { TokenUsage } from 'src/shared/contracts/types/token-usage.type';

/**
 * Builder utility for creating LLM metadata objects (TokenUsage and LlmInfo)
 * Centralizes the construction logic to avoid duplication across services
 */
export class LlmMetadataBuilder {
  /**
   * Builds TokenUsage and LlmInfo from an LLM service response
   * @param result - The response object from LLM service generateObject call
   * @param modelName - The model name used for the call
   * @param userPrompt - The user prompt sent to LLM
   * @param systemPrompt - The system prompt sent to LLM
   * @param promptVersion - The prompt version identifier
   * @param schemaName - Optional schema name for structured outputs
   * @returns TokenUsage and LlmInfo objects
   */
  static buildFromLlmResult(
    result: {
      inputTokens: number;
      outputTokens: number;
      provider?: string;
      finishReason?: string;
      warnings?: string[];
      providerMetadata?: Record<string, unknown>;
      response?: unknown;
      hyperParameters?: Record<string, unknown>;
    },
    modelName: string,
    userPrompt: string,
    systemPrompt: string,
    promptVersion: string,
    schemaName?: string,
  ): { tokenUsage: TokenUsage; llmInfo: LlmInfo } {
    const tokenUsage: TokenUsage = {
      model: modelName,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    };

    const llmInfo: LlmInfo = {
      model: modelName,
      provider: result.provider,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      userPrompt,
      systemPrompt,
      promptVersion,
      schemaName,
      finishReason: result.finishReason,
      warnings: result.warnings,
      providerMetadata: result.providerMetadata as any,
      response: result.response as any,
      hyperParameters: result.hyperParameters as any,
    };

    return { tokenUsage, llmInfo };
  }

  /**
   * Builds empty TokenUsage and LlmInfo (for mock services or empty results)
   * @param modelName - The model name
   * @param promptVersion - The prompt version identifier
   * @returns TokenUsage and LlmInfo objects with zero/empty values
   */
  static buildEmpty(
    modelName: string,
    promptVersion: string,
  ): { tokenUsage: TokenUsage; llmInfo: LlmInfo } {
    const tokenUsage: TokenUsage = {
      model: modelName,
      inputTokens: 0,
      outputTokens: 0,
    };

    const llmInfo: LlmInfo = {
      model: modelName,
      inputTokens: 0,
      outputTokens: 0,
      userPrompt: '',
      systemPrompt: '',
      promptVersion,
    };

    return { tokenUsage, llmInfo };
  }
}
