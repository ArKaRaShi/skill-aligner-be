import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateObject } from 'ai';
import dotenv from 'dotenv';
import { OccupationPath } from 'src/pipelines-v2/shared/constants/dir-path.constant';
import {
  classifySkillBatchPrompt,
  schema as skillClassificationSchema,
} from 'src/pipelines-v2/shared/constants/prompt/classify-skill.prompt';
import { FileHelper } from 'src/pipelines-v2/shared/helpers/file.helper';
import { OpenAITokenCounterService } from 'src/pipelines-v2/shared/services/openai-token-counter.service';
import { Occupation } from 'src/pipelines-v2/shared/types/occupation.type';

dotenv.config();

async function inspect() {
  const latestOccupations = FileHelper.readLatestJson<Occupation[]>(
    OccupationPath.FETCH,
  );
  console.log(`Read ${latestOccupations.length} occupations from latest fetch`);

  for (const occupation of latestOccupations) {
    if (occupation.name.toLowerCase() === 'software developer') {
      console.log(`Found matching occupation: ${occupation.name}`);

      // omit some fields for clearer inspection
      const {
        sourceMetadata,
        id,
        slugId,
        skills,
        knowledge,
        ...occupationWithoutMetadata
      } = occupation;
      console.dir(occupationWithoutMetadata, { depth: null });
      for (const {
        id,
        sourceMetadata,
        slugId,
        ...skillWithoutMetadata
      } of skills) {
        console.dir(skillWithoutMetadata, { depth: null });
      }
      const tokenCount = OpenAITokenCounterService.countTokens({
        text: classifySkillBatchPrompt(
          occupation.skills.map((skill) => ({
            name: skill.nameEn,
            description: skill.descriptionEn,
          })),
        ).prompt,
        model: 'gpt-4.1-mini',
      });
      const estimatedCost = OpenAITokenCounterService.estimateCost({
        tokenCount,
        model: 'gpt-4.1-mini',
        mode: 'input',
      });
      console.log(
        `Estimated token count: ${tokenCount}, Estimated cost: $${estimatedCost.toFixed(6)}`,
      );

      console.log(`Api key: ${process.env.OPENROUTER_API_KEY}`);
      const openRouter = createOpenRouter({
        apiKey: process.env.OPENROUTER_API_KEY || '',
        baseURL: 'https://openrouter.ai/api/v1',
      });
      const model = 'tngtech/deepseek-r1t2-chimera:free';
      return;
      const { object } = await generateObject({
        model: openRouter(model),
        schema: skillClassificationSchema,
        output: 'array',
        prompt: classifySkillBatchPrompt(
          occupation.skills.map((skill) => ({
            name: skill.nameEn,
            description: skill.descriptionEn,
          })),
        ).prompt,
      });
    }
  }
}

inspect().catch((error) => {
  console.error('Error during inspection:', error);
});

// bunx ts-node --require tsconfig-paths/register src/pipelines-v2/preprocessing/occupation-side/inspect.ts
