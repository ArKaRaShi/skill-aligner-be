import { z } from 'zod';

export const I_LLM_PROVIDER_CLIENT_TOKEN = Symbol('ILlmProviderClient');

export type GenerateTextParams = {
  prompt: string;
  systemPrompt: string;
};

export type GenerateObjectParams<TSchema extends z.ZodTypeAny> = {
  prompt: string;
  systemPrompt: string;
  schema: TSchema;
};

export interface ILlmProviderClient {
  /**
   * Generates text based on the provided prompt and system instructions.
   * @param prompt - The user prompt.
   * @param systemPrompt - The system instructions to guide the response.
   * @returns The generated text.
   */
  generateText({ prompt, systemPrompt }: GenerateTextParams): Promise<string>;

  /**
   * Generates a structured object based on the provided prompt, system instructions, and schema.
   * @param prompt - The user prompt.
   * @param systemPrompt - The system instructions to guide the response.
   * @param schema - The Zod schema defining the structure of the expected object.
   * @returns The generated object conforming to the provided schema.
   */
  generateObject<TSchema extends z.ZodTypeAny>({
    prompt,
    systemPrompt,
    schema,
  }: GenerateObjectParams<TSchema>): Promise<z.infer<TSchema>>;
}
