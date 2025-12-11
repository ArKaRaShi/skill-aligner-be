import { Inject, Injectable } from '@nestjs/common';

import { z } from 'zod';

import {
  I_LLM_PROVIDER_CLIENT_TOKEN,
  ILlmProviderClient,
} from 'src/modules/gpt-llm/contracts/i-llm-provider-client.contract';

import {
  I_COURSE_LEARNING_OUTCOME_REPOSITORY_TOKEN,
  ICourseLearningOutcomeRepository,
} from '../contracts/i-course-learning-outcome.repository';
import {
  FindLosBySkillsWithFilterParams,
  ICourseLearningOutcomeService,
} from '../contracts/i-course-learning-outcome.service';
import { LearningOutcomeMatch } from '../types/course-learning-outcome-v2.type';

@Injectable()
export class CourseLearningOutcomeService
  implements ICourseLearningOutcomeService
{
  constructor(
    @Inject(I_COURSE_LEARNING_OUTCOME_REPOSITORY_TOKEN)
    private readonly courseLearningOutcomeRepository: ICourseLearningOutcomeRepository,
    @Inject(I_LLM_PROVIDER_CLIENT_TOKEN)
    private readonly llmProviderClient: ILlmProviderClient,
  ) {}

  async getLosBySkillsWithFilter({
    skills,
    threshold,
    topN,
    vectorDimension,
    campusId,
    facultyId,
    isGenEd,
    academicYears,
    semesters,
    enableLlmFilter = false,
  }: FindLosBySkillsWithFilterParams): Promise<
    Map<string, LearningOutcomeMatch[]>
  > {
    const losBySkills =
      await this.courseLearningOutcomeRepository.findLosBySkills({
        skills,
        threshold,
        topN,
        vectorDimension,
        campusId,
        facultyId,
        isGenEd,
        academicYears,
        semesters,
      });

    if (!enableLlmFilter) {
      return losBySkills;
    }

    // Apply LLM filtering if enabled
    // TODO: Optimize by batching requests if necessary
    // TODO: Make the dedicated service for filtering LOs
    const filteredResults = new Map<string, LearningOutcomeMatch[]>();

    for (const [skill, los] of losBySkills.entries()) {
      if (los.length === 0) {
        filteredResults.set(skill, []);
        continue;
      }

      // Create filtering prompt
      const losText = los
        .map((lo) => `- ${lo.cleanedNameTh || lo.originalNameTh}`)
        .join('\n');

      const filterPrompt = `
You are a learning outcome relevance evaluator. Your task is to filter learning outcomes based on their relevance to the given skill.

SKILL: "${skill}"

LEARNING OUTCOMES TO EVALUUATE:
${losText}

INSTRUCTIONS:
1. Evaluate each learning outcome for its direct relevance to the skill
2. Keep only learning outcomes that are clearly and directly related to the skill
3. Remove learning outcomes that are too general, vague, or unrelated
4. Return the indices of learning outcomes to keep (0-based indexing)
5. Be selective - it's better to have fewer highly relevant outcomes than many mediocre ones

RESPONSE FORMAT:
Return only a JSON array of indices to keep, like: [0, 2, 4]
`;

      const filterSchema = z.object({
        keepIndices: z
          .array(z.number())
          .describe('Indices of learning outcomes to keep'),
      });

      try {
        const { object } = await this.llmProviderClient.generateObject({
          prompt: filterPrompt,
          systemPrompt:
            'You are a precise learning outcome evaluator. Respond only with valid JSON.',
          schema: filterSchema,
          model: 'openai/gpt-4o-mini',
        });

        // Filter learning outcomes based on LLM response
        const filteredLos = object.keepIndices
          .map((index) => los[index])
          .filter(Boolean);

        filteredResults.set(skill, filteredLos);
      } catch (error) {
        console.error(`LLM filtering failed for skill "${skill}":`, error);
        // Fallback to original results if LLM filtering fails
        filteredResults.set(skill, los);
      }
    }

    return filteredResults;
  }
}
