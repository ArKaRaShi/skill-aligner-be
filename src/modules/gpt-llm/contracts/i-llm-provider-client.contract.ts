import { z } from 'zod';

export const I_LLM_PROVIDER_CLIENT_TOKEN = Symbol('ILlmProviderClient');

export type GenerateTextInput = {
  prompt: string;
  systemPrompt: string;
  model: string;
};

export type GenerateObjectInput<TSchema extends z.ZodTypeAny> = {
  prompt: string;
  systemPrompt: string;
  schema: TSchema;
  model: string;
};

export type GenerateTextOutput = {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
};

export type GenerateObjectOutput<TSchema extends z.ZodTypeAny> = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  object: z.infer<TSchema>;
};

export interface ILlmProviderClient {
  /**
   * Generates a raw text completion using the specified model and prompts.
   * Returns the generated text together with basic token usage metadata so callers can track costs.
   */
  generateText({
    prompt,
    systemPrompt,
    model,
  }: GenerateTextInput): Promise<GenerateTextOutput>;

  /**
   * Generates a structured object by asking the model to fill a Zod schema and returns
   * both the validated object and the token usage metadata for cost tracking.
   */
  generateObject<TSchema extends z.ZodTypeAny>({
    prompt,
    systemPrompt,
    schema,
    model,
  }: GenerateObjectInput<TSchema>): Promise<GenerateObjectOutput<TSchema>>;
}
