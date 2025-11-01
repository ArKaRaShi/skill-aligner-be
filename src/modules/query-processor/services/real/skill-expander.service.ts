import { Inject, Injectable } from '@nestjs/common';

import {
  I_LLM_PROVIDER_CLIENT_TOKEN,
  ILlmProviderClient,
} from 'src/modules/gpt-llm/contracts/i-llm-provider-client.contract';

import { ISkillExpanderService } from '../../contracts/i-skill-expander-service.contract';
import { SkillExpansion } from '../../types/skill-expansion.type';

@Injectable()
export class SkillExpanderService implements ISkillExpanderService {
  constructor(
    @Inject(I_LLM_PROVIDER_CLIENT_TOKEN)
    private readonly llmProviderClient: ILlmProviderClient,
  ) {}

  async expandSkills(question: string): Promise<SkillExpansion> {
    const prompt = `Given the question: "${question}", identify and list relevant career skills or learning goals that the user might be interested in. Provide the skills as a comma-separated list. If no relevant skills can be identified, respond with "None".`;

    const text = await this.llmProviderClient.generateText({
      prompt,
      systemPrompt: `
      You are an expert career advisor skilled at identifying relevant skills and learning goals based on user questions.
      Example:
      Question: "อยากเรียนเกี่ยวกับการเงิน"
      Skills: "Financial Analysis, Investment Strategies, Risk Management, Financial Modeling, Accounting Principles"
      `,
    });

    const skillsText = text.trim();
    if (skillsText.toLowerCase() === 'none') {
      return {
        skills: [],
        rawQuestion: question,
      };
    }

    const skills = skillsText.split(',').map((skill) => skill.trim());
    return {
      skills: skills.map((skill) => ({
        skill,
        reason: 'Identified from user question',
      })),
      rawQuestion: question,
    };
  }
}
