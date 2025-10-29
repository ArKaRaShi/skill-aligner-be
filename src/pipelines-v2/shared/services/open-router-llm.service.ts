import { createOpenRouter, OpenRouterProvider } from "@openrouter/ai-sdk-provider";

export class OpenRouterLLMService {
    private readonly openRouter: OpenRouterProvider;

    constructor() {
        this.openRouter = createOpenRouter({
            apiKey: process.env.OPENROUTER_API_KEY || '',
            baseURL: 'https://openrouter.ai/api/v1',
        });
    }

    



}


 const openRouter = createOpenRouter({
        apiKey: process.env.OPENROUTER_API_KEY || '',
        baseURL: 'https://openrouter.ai/api/v1',
      });
      const model = 'tngtech/deepseek-r1t2-chimera:free';
      const { object } = await generateObject({
        model: openRouter(model),
        schema: skillClassificationSchema,
        output: 'array',
        prompt: classifySkillBatchPrompt(
          occupation.skills.map((skill) => ({
            name: skill.nameEn,
            description: skill.descriptionEn,
          })),
        ),
      });
      console.log('Skill classification result:');
      console.dir(object, { depth: null });
    }