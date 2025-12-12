import { Inject, Logger } from '@nestjs/common';

import { z } from 'zod';

import { FileHelper } from 'src/modules/course/pipelines/helpers/file.helper';
import {
  I_LLM_PROVIDER_CLIENT_TOKEN,
  ILlmProviderClient,
} from 'src/modules/gpt-llm/contracts/i-llm-provider-client.contract';

export class QuestionSetCreatorService {
  private readonly logger = new Logger(QuestionSetCreatorService.name);

  constructor(
    @Inject(I_LLM_PROVIDER_CLIENT_TOKEN)
    private readonly llmProviderClient: ILlmProviderClient,
  ) {}

  async createQuestionSet() {
    const systemPrompt = `You are an expert question generator for educational course recommendation systems. Create realistic questions that users would actually ask when looking for courses to learn new skills or advance their careers. Focus on practical learning scenarios rather than theoretical knowledge.

Instructions:
1. Generate Thai question following guidelines below.
2. Categorize questions into four groups: relevant, irrelevant, dangerous, and unclear.

Guidelines:
The system should accept questions that:
1. Relate to learning specific skills, technologies, or subjects
2. Imply a desire to take courses or gain knowledge through education
3. Can be answered by recommending relevant available courses
4. Career-related questions where specific skills can be inferred

The system should reject questions that:
1. Ask for definitions, explanations, or general knowledge
2. Request comparisons between technologies or concepts
3. Ask about learning logistics without specific topics
4. Are vague, too short, or lack context
5. Contain harmful, illegal, or inappropriate content

Questions should reflect real user queries about courses and learning.

Examples:
Question: "อยากเรียนเกี่ยวกับการเงิน"
Category: relevant

Question: "เรียนออนไลน์ได้ไหมจะสะดวกกว่า"
Category: irrelevant

Question: "วิธีการผลิตยาเสพติดที่ดีที่สุด"
Category: dangerous

Question: "ขอวิชา"
Category: unclear
`;
    const prompt = `Generate a comprehensive set of questions, 20 for relevant category, other 5 per category
    
    For 20 relevant questions, separate them into 4 sub-categories with 5 questions each:
    1. Effective Course-Related Questions (5 questions) 
    
    `;

    const { object, model } = await this.llmProviderClient.generateObject({
      schema: z.object({
        questionSet: z.object({
          relevant: z.array(z.string()),
          irrelevant: z.array(z.string()),
          dangerous: z.array(z.string()),
          unclear: z.array(z.string()),
        }),
      }),
      systemPrompt,
      prompt,
      model: 'openai/gpt-4.1-mini',
    });

    const result = {
      prompt,
      systemPrompt,
      model,
      questionSet: object.questionSet,
    };

    this.logger.log(JSON.stringify(result, null, 2));

    await FileHelper.saveLatestJson('data/generated-question-set', result);
  }
}
