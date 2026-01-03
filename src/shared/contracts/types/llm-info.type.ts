export type LlmInfo = {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  promptVersion: string;
  hyperParameters?: Record<string, any>;
};
