/**
 * Service Input Types
 *
 * Input types specifically tied to service contracts.
 * These are NOT shared across the module - they're specific to the service API.
 */

/**
 * Service input for extraction with LLM call
 * Used by QuestionExtractionService.extractFromQuestion()
 * This type is specifically tied to this service's API.
 */
export interface ExtractFromQuestionInput {
  questionLogId: string;
  extractionVersion: string;
  model?: string;
}
