import { Injectable } from '@nestjs/common';

import { LlmInfo } from 'src/shared/contracts/types/llm-info.type';
import { TokenUsage } from 'src/shared/contracts/types/token-usage.type';

import { ISkillExpanderService } from '../../contracts/i-skill-expander-service.contract';
import {
  TSkillExpansion,
  TSkillExpansionV2,
} from '../../types/skill-expansion.type';

@Injectable()
export class MockSkillExpanderService implements ISkillExpanderService {
  async expandSkills(_question: string): Promise<TSkillExpansion> {
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate async delay
    const tokenUsage: TokenUsage = {
      model: 'mock-model',
      inputTokens: 0,
      outputTokens: 0,
    };
    const llmInfo: LlmInfo = {
      model: 'mock-model',
      inputTokens: 0,
      outputTokens: 0,
      userPrompt: 'Mock user prompt',
      systemPrompt: 'Mock system prompt',
      promptVersion: 'v1',
    };
    return {
      skillItems: [
        {
          skill: 'Mock Skill 1',
          reason: 'Expanded from question context',
        },
        {
          skill: 'Mock Skill 2',
          reason: 'Relevant to topic',
        },
        {
          skill: 'Mock Skill 3',
          reason: 'Related to user query',
        },
      ],
      llmInfo,
      tokenUsage,
    };
  }

  async expandSkillsV2(question: string): Promise<TSkillExpansionV2> {
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate async delay
    const tokenUsage: TokenUsage = {
      model: 'mock-model',
      inputTokens: 0,
      outputTokens: 0,
    };
    const llmInfo: LlmInfo = {
      model: 'mock-model',
      inputTokens: 0,
      outputTokens: 0,
      userPrompt: 'Mock user prompt',
      systemPrompt: 'Mock system prompt',
      promptVersion: 'v2',
    };
    return {
      skillItems: [
        {
          skill: 'Mock Skill A',
          learningOutcome: 'Mock Learning Outcome A',
          reason: `Derived from ${question}`,
        },
      ],
      llmInfo,
      tokenUsage,
    };
  }
}
