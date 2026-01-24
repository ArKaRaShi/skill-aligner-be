import { LLMModelRegistration } from '../types/model.type';

const OPENROUTER_LLM_MODELS_REGISTRATIONS: LLMModelRegistration[] = [
  // OpenRouter models
  {
    baseModel: 'gpt-4o-mini',
    modelId: 'openai/gpt-4o-mini',
    provider: 'openrouter',
    cost: {
      inputCostPerMillionTokens: 0.15, // $0.15 per 1,000,000 tokens
      outputCostPerMillionTokens: 0.6, // $0.6 per 1,000,000 tokens
    },
  },
  {
    baseModel: 'gpt-4.1-mini',
    modelId: 'openai/gpt-4.1-mini',
    provider: 'openrouter',
    cost: {
      inputCostPerMillionTokens: 0.4, // $0.4 per 1,000,000 tokens
      outputCostPerMillionTokens: 1.6, // $1.6 per 1,000,000 tokens
    },
  },
  {
    baseModel: 'gpt-4.1-nano',
    modelId: 'openai/gpt-4.1-nano',
    provider: 'openrouter',
    cost: {
      inputCostPerMillionTokens: 0.1, // $0.1 per 1,000,000 tokens
      outputCostPerMillionTokens: 0.4, // $0.4 per 1,000,000 tokens
    },
  },
  {
    baseModel: 'gpt-5-nano',
    modelId: 'openai/gpt-5-nano',
    provider: 'openrouter',
    cost: {
      inputCostPerMillionTokens: 0.05, // $0.05 per 1,000,000 tokens
      outputCostPerMillionTokens: 0.4, // $0.40 per 1,000,000 tokens
    },
  },
  {
    baseModel: 'gpt-5-mini',
    modelId: 'openai/gpt-5-mini',
    provider: 'openrouter',
    cost: {
      inputCostPerMillionTokens: 0.25, // $0.25 per 1,000,000 tokens
      outputCostPerMillionTokens: 2.0, // $2.0 per 1,000,000 tokens
    },
  },
  {
    baseModel: 'gpt-oss-120b',
    modelId: 'openai/gpt-oss-120b',
    provider: 'openrouter',
    cost: {
      inputCostPerMillionTokens: 0.039, // $0.039 per 1,000,000 tokens
      outputCostPerMillionTokens: 0.19, // $0.19 per 1,000,000 tokens
    },
  },
  {
    baseModel: 'gemini-2.5-flash',
    modelId: 'google/gemini-2.5-flash',
    provider: 'openrouter',
    cost: {
      inputCostPerMillionTokens: 0.3, // $0.30 per 1,000,000 tokens
      outputCostPerMillionTokens: 2.5, // $2.50 per 1,000,000 tokens
    },
  },
  {
    baseModel: 'gemini-2.0-flash-001',
    modelId: 'google/gemini-2.0-flash-001',
    provider: 'openrouter',
    cost: {
      inputCostPerMillionTokens: 0.1, // $0.1 per 1,000,000 tokens
      outputCostPerMillionTokens: 0.4, // $0.4 per 1,000,000 tokens
    },
  },
  {
    baseModel: 'gemini-3-flash-preview',
    modelId: 'google/gemini-3-flash-preview',
    provider: 'openrouter',
    cost: {
      inputCostPerMillionTokens: 0.5, // $0.5 per 1,000,000 tokens
      outputCostPerMillionTokens: 3.0, // $3.0 per 1,000,000 tokens
    },
  },
  {
    baseModel: 'grok-4.1-fast',
    modelId: 'x-ai/grok-4.1-fast',
    provider: 'openrouter',
    cost: {
      inputCostPerMillionTokens: 0.2, // $0.2 per 1,000,000 tokens
      outputCostPerMillionTokens: 0.5, // $0.5 per 1,000,000 tokens
    },
  },
];

const OPENAI_LLM_MODELS_REGISTRATIONS: LLMModelRegistration[] = [
  // OpenAI models
  {
    baseModel: 'gpt-4o-mini',
    modelId: 'gpt-4o-mini',
    provider: 'openai',
    cost: {
      inputCostPerMillionTokens: 0.15, // $0.15 per 1,000,000 tokens
      outputCostPerMillionTokens: 0.6, // $0.6 per 1,000,000 tokens
    },
  },
  {
    baseModel: 'gpt-4.1-mini',
    modelId: 'gpt-4.1-mini',
    provider: 'openai',
    cost: {
      inputCostPerMillionTokens: 0.4, // $0.4 per 1,000,000 tokens
      outputCostPerMillionTokens: 1.6, // $1.6 per 1,000,000 tokens
    },
  },
  {
    baseModel: 'gpt-4.1-nano',
    modelId: 'gpt-4.1-nano',
    provider: 'openai',
    cost: {
      inputCostPerMillionTokens: 0.1, // $0.1 per 1,000,000 tokens
      outputCostPerMillionTokens: 0.4, // $0.4 per 1,000,000 tokens
    },
  },
];

/**
 * Unified LLM model registry constant.
 * Single source of truth for all model registrations, including:
 * - Base model names
 * - Provider-specific model IDs
 * - Provider information
 * - Cost rates
 *
 * This constant is used by both ModelRegistryService and TokenCostCalculator.
 * When adding a new model, add an entry here with all required data.
 */
export const LLM_MODEL_REGISTRATIONS: LLMModelRegistration[] = [
  ...OPENROUTER_LLM_MODELS_REGISTRATIONS,
  ...OPENAI_LLM_MODELS_REGISTRATIONS,
];
