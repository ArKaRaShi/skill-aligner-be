/**
 * Query Pipeline Configuration Public API
 *
 * This barrel file provides a single entry point for all pipeline configurations.
 * Individual configs can be imported from their specific files for better tree-shaking.
 *
 * @example
 * // Import all configs (convenient)
 * import {
 *   PIPELINE_STEPS,
 *   QueryPipelinePromptConfig,
 *   QueryPipelineConfig,
 * } from './configs';
 *
 * @example
 * // Import specific config (better tree-shaking)
 * import { PIPELINE_STEPS } from './configs/pipeline-steps.config';
 */

// Pipeline steps (single source of truth for timing, tokens, display)
export {
  PIPELINE_STEPS,
  PipelineStep,
  type PipelineStepValue,
  type TimingKey,
  type TokenKey,
  type DisplayKey,
  type DatabaseStepName,
} from './pipeline-steps.config';

// Prompt versions
export {
  QueryPipelinePromptConfig,
  type QueryPipelinePromptConfig as TQueryPipelinePromptConfig,
} from './prompt-versions.config';

// Behavioral configuration (timeouts, thresholds, limits)
export {
  QueryPipelineConfig,
  type QueryPipelineConfig as TQueryPipelineConfig,
} from './pipeline-behavior.config';

// Fallback messages
export {
  QueryPipelineFallbackMessages,
  type QueryPipelineFallbackMessages as TQueryPipelineFallbackMessages,
} from './fallback-messages.config';
