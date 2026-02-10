import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import type { Identifier } from 'src/shared/contracts/types/identifier';
import type { LlmInfo } from 'src/shared/contracts/types/llm-info.type';
import { AppConfigService } from 'src/shared/kernel/config/app-config.service';
import { PrismaService } from 'src/shared/kernel/database/prisma.service';
import { v4 as uuidv4 } from 'uuid';

import { PrismaQuestionAnalyticsRepository } from '../prisma-question-analytics.repository';
import { PrismaQuestionLogAnalysisRepository } from '../prisma-question-log-analysis.repository';

// =============================================================================
// MOCK UUID CONSTANTS
// =============================================================================

export const MOCK_QUESTION_LOG1_ID = '11111111-1111-1111-1111-111111111111';
export const MOCK_QUESTION_LOG2_ID = '22222222-2222-2222-2222-222222222222';
export const MOCK_QUESTION_LOG3_ID = '33333333-3333-3333-3333-333333333333';

export const MOCK_ANALYSIS1_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
export const MOCK_ANALYSIS2_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
export const MOCK_ANALYSIS3_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
export const MOCK_ANALYSIS4_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

// =============================================================================
// MOCK LLM INFO
// =============================================================================

export const createMockLlmInfo = (overrides?: Partial<LlmInfo>): LlmInfo => ({
  model: 'gpt-4o-mini',
  provider: 'openrouter',
  inputTokens: 100,
  outputTokens: 50,
  systemPrompt: 'Test system prompt',
  userPrompt: 'Test user prompt',
  promptVersion: 'v1',
  schemaName: 'EntityExtractionSchema',
  finishReason: 'stop',
  warnings: [],
  providerMetadata: {
    id: 'test-id',
    model: 'test-model',
  },
  response: {
    timestamp: new Date(),
    modelId: 'test-model-id',
    headers: {},
  },
  hyperParameters: {},
  ...overrides,
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Insert a question log for testing
 */
export async function insertQuestionLog({
  prisma,
  id,
  questionText,
}: {
  prisma: PrismaService;
  id: string;
  questionText: string;
}) {
  await prisma.questionLog.create({
    data: {
      id,
      questionText,
    },
  });
}

/**
 * Insert question log analysis with entities for testing
 */
export async function insertQuestionLogAnalysisWithEntities({
  prisma,
  analysisId,
  questionLogId,
  extractionVersion = 'v1',
  extractionNumber = 1,
  modelUsed = 'gpt-4o-mini',
  overallQuality = 'high',
  entityCounts,
  extractionCost = 0.001,
  tokensUsed = 150,
  reasoning = 'Test reasoning',
  llm,
  entities,
}: {
  prisma: PrismaService;
  analysisId: string;
  questionLogId: string;
  extractionVersion?: string;
  extractionNumber?: number;
  modelUsed?: string;
  overallQuality?: 'high' | 'medium' | 'low' | 'none';
  entityCounts: {
    topics: number;
    skills: number;
    tasks: number;
    roles: number;
  };
  extractionCost?: number;
  tokensUsed?: number;
  reasoning?: string;
  llm?: LlmInfo | null;
  entities: Array<{
    type: 'topic' | 'skill' | 'task' | 'role';
    name: string;
    normalizedLabel: string;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    source: 'explicit' | 'inferred';
  }>;
}) {
  const analysis = await prisma.questionLogAnalysis.create({
    data: {
      id: analysisId,
      questionLogId,
      extractionVersion,
      extractionNumber,
      modelUsed,
      extractedAt: new Date(),
      overallQuality,
      entityCounts,
      extractionCost,
      tokensUsed,
      reasoning,
      llm: (llm ?? null) as any,
      entities: {
        create: entities.map((entity) => ({
          id: uuidv4(),
          type: entity.type,
          name: entity.name,
          normalizedLabel: entity.normalizedLabel,
          confidence: entity.confidence,
          source: entity.source,
        })),
      },
    },
  });

  return analysis;
}

// =============================================================================
// TEST FIXTURE CLASS
// =============================================================================

export class QuestionAnalysesTestFixture {
  module: TestingModule;
  prisma: PrismaService;
  analyticsRepository: PrismaQuestionAnalyticsRepository;
  logAnalysisRepository: PrismaQuestionLogAnalysisRepository;

  // Test data IDs
  questionLog1Id: Identifier;
  questionLog2Id: Identifier;
  questionLog3Id: Identifier;

  async setup() {
    this.module = await Test.createTestingModule({
      providers: [
        PrismaService,
        AppConfigService,
        ConfigService,
        PrismaQuestionAnalyticsRepository,
        PrismaQuestionLogAnalysisRepository,
      ],
    }).compile();

    this.prisma = this.module.get<PrismaService>(PrismaService);
    this.analyticsRepository =
      this.module.get<PrismaQuestionAnalyticsRepository>(
        PrismaQuestionAnalyticsRepository,
      );
    this.logAnalysisRepository =
      this.module.get<PrismaQuestionLogAnalysisRepository>(
        PrismaQuestionLogAnalysisRepository,
      );
  }

  async beforeEach() {
    // Clean up database before each test
    await this.prisma
      .$executeRaw`TRUNCATE TABLE extracted_entities, question_log_analyses, question_logs RESTART IDENTITY CASCADE;`;

    // Create question logs
    await insertQuestionLog({
      prisma: this.prisma,
      id: MOCK_QUESTION_LOG1_ID,
      questionText: 'I want to learn Python for machine learning',
    });
    this.questionLog1Id = MOCK_QUESTION_LOG1_ID as Identifier;

    await insertQuestionLog({
      prisma: this.prisma,
      id: MOCK_QUESTION_LOG2_ID,
      questionText: 'อยากเป็น Data Scientist ต้องมีทักษะอะไร?',
    });
    this.questionLog2Id = MOCK_QUESTION_LOG2_ID as Identifier;

    await insertQuestionLog({
      prisma: this.prisma,
      id: MOCK_QUESTION_LOG3_ID,
      questionText: 'สอนทำเว็บไหม',
    });
    this.questionLog3Id = MOCK_QUESTION_LOG3_ID as Identifier;
  }

  /**
   * Create sample analyses with entities for testing
   */
  async seedSampleAnalyses() {
    // Analysis 1: Python + machine learning (high quality)
    await insertQuestionLogAnalysisWithEntities({
      prisma: this.prisma,
      analysisId: MOCK_ANALYSIS1_ID,
      questionLogId: this.questionLog1Id,
      extractionVersion: 'v1',
      extractionNumber: 1,
      overallQuality: 'high',
      entityCounts: { topics: 1, skills: 1, tasks: 0, roles: 0 },
      tokensUsed: 150,
      reasoning: 'Explicit topic and skill with clear learning intent',
      llm: createMockLlmInfo(),
      entities: [
        {
          type: 'topic',
          name: 'Machine Learning',
          normalizedLabel: 'machine-learning',
          confidence: 'HIGH',
          source: 'explicit',
        },
        {
          type: 'skill',
          name: 'Python',
          normalizedLabel: 'python',
          confidence: 'HIGH',
          source: 'explicit',
        },
      ],
    });

    // Analysis 2: Data Scientist role (high quality)
    await insertQuestionLogAnalysisWithEntities({
      prisma: this.prisma,
      analysisId: MOCK_ANALYSIS2_ID,
      questionLogId: this.questionLog2Id,
      extractionVersion: 'v1',
      extractionNumber: 1,
      overallQuality: 'high',
      entityCounts: { topics: 1, skills: 0, tasks: 0, roles: 1 },
      tokensUsed: 120,
      reasoning: 'Explicit role mention with clear learning intent',
      llm: createMockLlmInfo(),
      entities: [
        {
          type: 'topic',
          name: 'Data Science',
          normalizedLabel: 'data-science',
          confidence: 'HIGH',
          source: 'inferred',
        },
        {
          type: 'role',
          name: 'Data Scientist',
          normalizedLabel: 'data-scientist',
          confidence: 'HIGH',
          source: 'explicit',
        },
      ],
    });

    // Analysis 3: Web development (medium quality)
    await insertQuestionLogAnalysisWithEntities({
      prisma: this.prisma,
      analysisId: MOCK_ANALYSIS3_ID,
      questionLogId: this.questionLog3Id,
      extractionVersion: 'v1',
      extractionNumber: 1,
      overallQuality: 'medium',
      entityCounts: { topics: 0, skills: 1, tasks: 1, roles: 0 },
      tokensUsed: 100,
      reasoning: 'Explicit task with inferred skill',
      llm: createMockLlmInfo(),
      entities: [
        {
          type: 'skill',
          name: 'web development',
          normalizedLabel: 'web-development',
          confidence: 'MEDIUM',
          source: 'inferred',
        },
        {
          type: 'task',
          name: 'Making a Website',
          normalizedLabel: 'making-a-website',
          confidence: 'HIGH',
          source: 'explicit',
        },
      ],
    });

    // Analysis 4: Second extraction for question log 1 (testing auto-increment)
    await insertQuestionLogAnalysisWithEntities({
      prisma: this.prisma,
      analysisId: MOCK_ANALYSIS4_ID,
      questionLogId: this.questionLog1Id,
      extractionVersion: 'v1',
      extractionNumber: 2,
      overallQuality: 'high',
      entityCounts: { topics: 1, skills: 1, tasks: 0, roles: 0 },
      tokensUsed: 150,
      reasoning: 'Repeated extraction',
      llm: createMockLlmInfo(),
      entities: [
        {
          type: 'topic',
          name: 'Machine Learning',
          normalizedLabel: 'machine-learning',
          confidence: 'HIGH',
          source: 'explicit',
        },
        {
          type: 'skill',
          name: 'Python',
          normalizedLabel: 'python',
          confidence: 'HIGH',
          source: 'explicit',
        },
      ],
    });
  }

  async cleanup() {
    await this.prisma
      .$executeRaw`TRUNCATE TABLE extracted_entities, question_log_analyses, question_logs RESTART IDENTITY CASCADE;`;
    await this.module.close();
  }
}
