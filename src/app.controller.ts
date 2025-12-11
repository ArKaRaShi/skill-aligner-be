import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common';
import { ApiBody, ApiProperty, ApiQuery } from '@nestjs/swagger';

import {
  createOpenRouter,
  OpenRouterProvider,
} from '@openrouter/ai-sdk-provider';
import { generateObject, tool } from 'ai';
import { z } from 'zod';

import { appendObjectToArrayFile } from './append-result.util';
import { AppConfigService } from './config/app-config.service';
import {
  I_COURSE_LEARNING_OUTCOME_REPOSITORY_TOKEN,
  ICourseLearningOutcomeRepository,
} from './modules/course/contracts/i-course-learning-outcome.repository';
import {
  I_COURSE_REPOSITORY_TOKEN,
  ICourseRepository,
} from './modules/course/contracts/i-course.repository';
import {
  I_EMBEDDING_CLIENT_TOKEN,
  IEmbeddingClient,
} from './modules/embedding/contracts/i-embedding-client.contract';
import {
  I_SKILL_EXPANDER_SERVICE_TOKEN,
  ISkillExpanderService,
} from './modules/query-processor/contracts/i-skill-expander-service.contract';
import {
  I_TOOL_DISPATCHER_SERVICE_TOKEN,
  IToolDispatcherService,
} from './modules/query-processor/contracts/i-tool-dispatcher-service.contract';
import { SkillExpansionV2 } from './modules/query-processor/types/skill-expansion.type';

export const weatherTool = tool({
  description: 'Get the weather in a location',
  inputSchema: z.object({
    location: z.string().describe('The location to get the weather for'),
  }),
  outputSchema: z.object({
    location: z.string().describe('The location the weather is for'),
    temperatureCelsius: z.number().describe('The temperature in Celsius'),
    temperatureFahrenheit: z.number().describe('The temperature in Fahrenheit'),
    condition: z
      .string()
      .describe('The weather condition (e.g., sunny, rainy)'),
  }),
  // eslint-disable-next-line @typescript-eslint/require-await
  execute: async ({ location }) => {
    const getRandomWeather = () => {
      const temperaturesCelsius = [20, 22, 25, 27, 30];
      const conditions = ['sunny', 'cloudy', 'rainy', 'windy', 'stormy'];
      const randomTemp =
        temperaturesCelsius[
          Math.floor(Math.random() * temperaturesCelsius.length)
        ];
      const randomCondition =
        conditions[Math.floor(Math.random() * conditions.length)];
      return { temperature: randomTemp, condition: randomCondition };
    };

    const weather = getRandomWeather();
    console.log(
      `Fetched weather for ${location}:`,
      JSON.stringify(weather, null, 2),
    );
    return {
      location,
      temperatureCelsius: weather.temperature,
      temperatureFahrenheit: (weather.temperature * 9) / 5 + 32,
      condition: weather.condition,
    };
  },
});

type GSC = {
  knowledge: number;
  activeCognition: number;
  conation: number;
  affection: number;
  sensoryMotorAbilities: number;
};

type SkillCategory = 'hard' | 'soft' | 'uncertain';
const SkillCategoryValues = ['hard', 'soft', 'uncertain'] as const;

type SkillClassificationResult = {
  skill: string;
  gsc: GSC;
  llmLabeledCategory: SkillCategory;
  heuristicLabeledCategory: SkillCategory;
  agreement: boolean;

  hardScore: number;
  softScore: number;
  diff: number;
};

@Controller()
export class AppController {
  private readonly openRouter: OpenRouterProvider;

  constructor(
    private readonly appConfigService: AppConfigService,
    @Inject(I_COURSE_REPOSITORY_TOKEN)
    private readonly courseRepository: ICourseRepository,
    @Inject(I_COURSE_LEARNING_OUTCOME_REPOSITORY_TOKEN)
    private readonly courseLearningOutcomeRepository: ICourseLearningOutcomeRepository,

    @Inject(I_EMBEDDING_CLIENT_TOKEN)
    private readonly embeddingService: IEmbeddingClient,
    @Inject(I_TOOL_DISPATCHER_SERVICE_TOKEN)
    private readonly toolDispatcherService: IToolDispatcherService,

    @Inject(I_SKILL_EXPANDER_SERVICE_TOKEN)
    private readonly skillExpanderService: ISkillExpanderService,
  ) {
    this.openRouter = createOpenRouter({
      apiKey: this.appConfigService.openRouterApiKey,
      baseURL: 'https://openrouter.ai/api/v1',
    });
  }

  @Get('/openrouter')
  async getResponse(@Query('question') question: string): Promise<string> {
    const completions = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.appConfigService.openRouterApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-20b:free',
          messages: [
            {
              role: 'user',
              content: question,
            },
          ],
        }),
      },
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await completions.json();
  }

  @Get('/test-skill-expander')
  async testSkillExpander(
    @Query('question') question: string,
  ): Promise<SkillExpansionV2> {
    const result = await this.skillExpanderService.expandSkillsV2(question);
    return result;
  }

  private readonly ScoreWeight = {
    STRONG: 0.6,
    MODERATE: 0.3,
    WEAK: 0.1,
  };
  private heuristicClassifiedGSC(gsc: GSC): {
    decision: SkillCategory;
    hardScore: number;
    softScore: number;
    diff: number;
  } {
    const {
      knowledge,
      activeCognition,
      conation,
      affection,
      sensoryMotorAbilities,
    } = gsc;

    // Heuristic ratios (Strong=0.6, Moderate=0.3, Weak=0.1)
    const hardWeights = {
      knowledge: this.ScoreWeight.STRONG,
      activeCognition: this.ScoreWeight.MODERATE,
      conation: this.ScoreWeight.WEAK, // minimal motivation influence
      affection: this.ScoreWeight.WEAK, // minimal empathy influence
      sensoryMotorAbilities: this.ScoreWeight.STRONG,
    };
    const softWeights = {
      knowledge: this.ScoreWeight.WEAK, // minor factual background
      activeCognition: this.ScoreWeight.MODERATE,
      conation: this.ScoreWeight.STRONG,
      affection: this.ScoreWeight.STRONG,
      sensoryMotorAbilities: this.ScoreWeight.WEAK,
    };

    // Normalized weighted average scores
    const hardScore =
      (knowledge * hardWeights.knowledge +
        activeCognition * hardWeights.activeCognition +
        conation * hardWeights.conation +
        affection * hardWeights.affection +
        sensoryMotorAbilities * hardWeights.sensoryMotorAbilities) /
      Object.values(hardWeights).reduce((a, b) => a + b, 0);

    const softScore =
      (knowledge * softWeights.knowledge +
        activeCognition * softWeights.activeCognition +
        conation * softWeights.conation +
        affection * softWeights.affection +
        sensoryMotorAbilities * softWeights.sensoryMotorAbilities) /
      Object.values(softWeights).reduce((a, b) => a + b, 0);

    console.log(
      `Heuristic Scores => Hard: ${hardScore.toFixed(2)}, Soft: ${softScore.toFixed(2)}`,
    );
    const diff = Math.abs(hardScore - softScore);

    // Tunable threshold for "uncertain" classification
    const UNCERTAIN_THRESHOLD = 0.25;

    let decision: SkillCategory;
    if (diff < UNCERTAIN_THRESHOLD) {
      decision = 'uncertain';
    } else if (hardScore > softScore) {
      decision = 'hard';
    } else {
      decision = 'soft';
    }
    console.log(`Heuristic Decision: ${decision} (diff: ${diff.toFixed(2)})`);

    return { decision, hardScore, softScore, diff };
  }

  // --- LLM-based GSC Scoring and Classification ---
  @Post('/classify-skill')
  @ApiProperty({
    description: 'Classify a skill using LLM and heuristic methods',
  })
  @ApiBody({
    description: 'Skill and description to classify',
    schema: {
      type: 'object',
      properties: {
        skill: {
          type: 'string',
          example: 'Python programming',
        },
        description: {
          type: 'string',
          example:
            'Ability to write and understand Python code for various applications.',
        },
      },
      required: ['skill', 'description'],
    },
  })
  async classifySkill(
    @Body() body: { skill: string; description: string },
  ): Promise<{ data: SkillClassificationResult }> {
    const { skill, description } = body;
    const skillSchema = z.object({
      skill_name: z.string().describe('The name of the skill'),
      gsc: z.object({
        knowledge: z.int().min(1).max(5).describe('knowledge level (1–5)'),
        active_cognition: z
          .int()
          .min(1)
          .max(5)
          .describe('active cognition level (1–5)'),
        conation: z.int().min(1).max(5).describe('conation level (1–5)'),
        affection: z.int().min(1).max(5).describe('affection level (1–5)'),
        sensory_motor_abilities: z
          .int()
          .min(1)
          .max(5)
          .describe('sensory motor abilities level (1–5)'),
      }),
      llm_classified_category: z
        .enum(SkillCategoryValues)
        .describe('skill category'),
    });

    const prompt = `
ROLE:
You are a careful classifier. Score ONE skill using the Generic Skills Component (GSC) framework

Skill to score: "${skill}"
Description: "${description}"

INSTRUCTIONS:
1. Consider typical workplace usage of the skill term.
2. If the term is broad/ambiguous, bias toward mid-levels (e.g., 3) rather than guessing extremes.
3. Do NOT invent or rename the skill.
4. Output ONLY the JSON object; no prose, no code fences, no examples.

CONTEXT: 
The GSC framework scores skills on five dimensions from 1 (low) to 5 (high):
SCORING RULES (use integers 1–5 ONLY; no decimals):
- Knowledge (K): factual/procedural information required
  1 = no specific domain knowledge; generic or everyday
  2 = basic familiarity; a few domain terms
  3 = routine domain facts/procedures are useful
  4 = substantial domain/technical/legal/method knowledge needed
  5 = deep, explicit domain/procedural knowledge is central to performing the skill

- Active Cognition (Cogn): analysis, planning, decision-making
  1 = trivial/routine, little reasoning
  2 = simple choices or recall
  3 = regular analysis/planning; compare options
  4 = frequent problem-solving; handle trade-offs/constraints
  5 = complex reasoning under uncertainty is central

- Conation (Con): motivation, persistence, self-regulation
  1 = minimal persistence or self-regulation
  2 = occasional sustained effort
  3 = regular goal focus and self-management
  4 = high persistence/initiative often required
  5 = strong sustained drive under pressure is central

- Affection (Aff): social/emotional interaction
  1 = negligible social/emotional demands
  2 = occasional interaction; basic courtesy
  3 = regular interaction; basic empathy/regulation
  4 = strong interpersonal influence/coordination needed
  5 = empathy/persuasion/relationship-building is central

- Sensory-Motor Abilities (SM): physical/perceptual-motor execution
  1 = no manual/physical precision
  2 = basic tool use; low coordination
  3 = routine manual/operational coordination
  4 = high precision/coordination with tools/instruments
  5 = expert fine-motor coordination is central

EXAMPLE:
Input: "Python programming"
Output:
{
  "skill_name": "Python programming",
  "gsc": {
    "knowledge": 5,
    "active_cognition": 4,
    "conation": 3,
    "affection": 2
    "sensory_motor_abilities": 1
  },
  "llm_classified_category": "hard"
}
{
  "skill_name": "Logical analysis",
  "gsc": {
    "knowledge": 4,
    "active_cognition": 5,
    "conation": 2,
    "affection": 1,
    "sensory_motor_abilities": 1
  },
  "llm_classified_category": "hard"
}
`;

    const model = 'tngtech/deepseek-r1t2-chimera:free';
    const { object } = await generateObject({
      model: this.openRouter(model),
      temperature: 0,
      seed: 0,

      // 2. Redundant Determinism Settings (Add these for safety)
      topP: 1, // Prevents nucleus sampling from interfering
      // top_k: 0, // This is often a default, but if supported, set to 0 or a max value

      prompt,
      schema: skillSchema,
    });

    const gsc: GSC = {
      knowledge: object.gsc.knowledge,
      activeCognition: object.gsc.active_cognition,
      conation: object.gsc.conation,
      affection: object.gsc.affection,
      sensoryMotorAbilities: object.gsc.sensory_motor_abilities,
    };

    const {
      decision: category,
      hardScore,
      softScore,
      diff,
    } = this.heuristicClassifiedGSC(gsc);

    // Persisting results
    const result: SkillClassificationResult = {
      skill: object.skill_name,
      gsc,
      llmLabeledCategory: object.llm_classified_category,
      heuristicLabeledCategory: category,
      agreement: object.llm_classified_category === category,
      hardScore,
      softScore,
      diff,
    };

    const fileName = 'output.json';
    appendObjectToArrayFile<SkillClassificationResult>(fileName, result);

    return { data: result };
  }

  @Get('/test/course-repository')
  async testCourseRepository(
    @Query('skills') skillsQuery?: string,
  ): Promise<any> {
    console.time('CourseRepositoryTest');
    // Parse skills from comma-separated query string or use defaults
    const skills = skillsQuery
      ? skillsQuery
          .split(',')
          .map((skill) => skill.trim())
          .filter((skill) => skill.length > 0)
      : [
          'machine learning basics',
          'data analysis',
          'programming fundamentals',
          'mathematics for ai',
        ];

    const matchesPerSkill = 20;
    const threshold = 0.6;

    if (skills.length === 0) {
      return { error: 'At least one skill must be provided' };
    }

    const result = await this.courseRepository.findCoursesBySkillsViaLO({
      skills,
      matchesPerSkill,
      threshold,
    });

    const arrayResult = Array.from(result.entries()).map(([skill, courses]) => {
      const coursesWithoutEmbeddings = courses.map(
        ({ cloMatches, ...course }) => {
          const cloMatchesWithoutEmbeddings = cloMatches.map(
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            ({ embedding, ...cloMatch }) => cloMatch,
          );

          return {
            ...course,
            cloMatches: cloMatchesWithoutEmbeddings,
          };
        },
      );

      return {
        skill,
        courses: coursesWithoutEmbeddings,
      };
    });

    // Extract and log learning outcomes with similarity scores
    const losWithSim = arrayResult.flatMap((skillResult) =>
      skillResult.courses.flatMap((course) =>
        course.cloMatches.map((clo) => ({
          lo_name: clo.cleanedCLONameTh,
          sim: clo.similarityScore,
        })),
      ),
    );

    console.log('Learning Outcomes Array:', losWithSim);

    console.timeEnd('CourseRepositoryTest');
    console.log('Course length: ', arrayResult[0].courses.length);

    return arrayResult;
  }

  @Get('/test/embedding-service')
  async testEmbeddingService(): Promise<any> {
    const text = 'Sample text for embedding';

    const embeddings = await this.embeddingService.embedOne({
      text,
      role: 'query',
    });
    console.log('Embeddings:', embeddings);
    return embeddings;
  }

  @Get('/test/tool-dispatcher')
  async testToolDispatcher(@Query('query') query: string): Promise<any> {
    if (!query) {
      return { error: 'Query parameter is required' };
    }

    try {
      const executionPlan =
        await this.toolDispatcherService.generateExecutionPlan(query);
      return { query, executionPlan };
    } catch (error) {
      console.error('Error in tool dispatcher:', error);
      return {
        error: 'Failed to generate execution plan',
        details: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Get('/test/clo-repository')
  @ApiQuery({
    name: 'skills',
    required: false,
    description:
      'Comma-separated list of skills to search for (default: predefined set)',
  })
  @ApiQuery({
    name: 'threshold',
    required: false,
    description: 'Similarity threshold between 0 and 1 (default: 0.75)',
    example: '0.75',
  })
  @ApiQuery({
    name: 'topN',
    required: false,
    description: 'Number of top matches to return per skill (default: 10)',
    example: '10',
  })
  @ApiQuery({
    name: 'vectorDimension',
    required: false,
    description: 'Dimension of embedding vectors (768 or 1536, default: 768)',
    example: '768',
  })
  async testCloRepository(
    @Query('skills') skillsQuery?: string,
    @Query('threshold') thresholdQuery?: string,
    @Query('topN') topNQuery?: string,
    @Query('vectorDimension') vectorDimensionQuery?: string,
  ): Promise<any> {
    console.time('CloRepositoryTest');

    // Parse skills from comma-separated query string or use defaults
    const skills = skillsQuery
      ? skillsQuery
          .split(',')
          .map((skill) => skill.trim())
          .filter((skill) => skill.length > 0)
      : [
          'machine learning basics',
          'data analysis',
          'programming fundamentals',
          'mathematics for ai',
        ];

    const threshold = thresholdQuery ? parseFloat(thresholdQuery) : 0.75;
    const topN = topNQuery ? parseInt(topNQuery, 10) : 10;
    const vectorDimension = vectorDimensionQuery
      ? (parseInt(vectorDimensionQuery, 10) as 768 | 1536)
      : 768;

    if (skills.length === 0) {
      return { error: 'At least one skill must be provided' };
    }

    const result = await this.courseLearningOutcomeRepository.findLosBySkills({
      skills,
      threshold,
      topN,
      vectorDimension,
    });

    const arrayResult = Array.from(result.entries()).map(([skill, los]) => {
      const losWithoutEmbeddings = los.map((lo) => {
        const { embedding, ...loWithoutEmbedding } = lo;
        return loWithoutEmbedding;
      });

      return {
        skill,
        learningOutcomes: losWithoutEmbeddings,
      };
    });

    // Extract and log learning outcomes with similarity scores
    const losWithSim = arrayResult.flatMap((skillResult) =>
      skillResult.learningOutcomes.map((lo) => ({
        lo_name: lo.cleanedNameTh,
        sim: lo.similarityScore,
      })),
    );

    console.log('Learning Outcomes Array:', losWithSim);
    console.timeEnd('CloRepositoryTest');
    console.log('LO length: ', arrayResult[0]?.learningOutcomes?.length || 0);

    return arrayResult;
  }
}
