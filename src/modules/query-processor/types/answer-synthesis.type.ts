import { StreamTextChunk } from 'src/shared/adapters/llm/contracts/i-llm-provider-client.contract';
import { LlmInfo } from 'src/shared/contracts/types/llm-info.type';
import { TokenUsage } from 'src/shared/contracts/types/token-usage.type';

export type AnswerSynthesisResult = {
  answerText: string;
  question: string;
  llmInfo: LlmInfo;
  tokenUsage: TokenUsage;
};

/**
 * Result type for streaming answer synthesis.
 * Provides immediate access to the question and stream, with final metadata resolved when streaming completes.
 */
export type AnswerSynthesisStreamResult = {
  /** Async generator that yields text chunks as they arrive from LLM */
  stream: AsyncGenerator<StreamTextChunk>;

  /** The question being answered (available immediately) */
  question: string;

  /** Resolves when stream completes with full metadata (token usage and LLM info) */
  onComplete: Promise<{
    tokenUsage: TokenUsage;
    llmInfo: LlmInfo;
  }>;
};
