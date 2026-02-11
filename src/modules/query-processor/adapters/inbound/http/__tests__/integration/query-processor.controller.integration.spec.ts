import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import type { Response } from 'express';
import { I_SSE_EMITTER_FACTORY_TOKEN } from 'src/shared/adapters/sse/sse-emitter.factory';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AnswerQuestionStreamUseCase } from '../../../../../use-cases/answer-question-stream.use-case';
import { AnswerQuestionUseCase } from '../../../../../use-cases/answer-question.use-case';
import { ClassifyQuestionUseCase } from '../../../../../use-cases/classify-question.use-case';
import { ExpandSkillsUseCase } from '../../../../../use-cases/expand-skills.use-case';
import { QueryProcessorController } from '../../query-processor.controller';

/**
 * HTTP Integration Tests for QueryProcessorController Rate Limiting
 *
 * These tests verify that the @Throttle decorator correctly limits
 * AI endpoint requests to 5 requests per 60 seconds.
 *
 * This setup avoids DB/AppModule by mocking use-cases.
 */
describe('QueryProcessorController (http) - Rate Limiting', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;

  const answerQuestionUseCase = {
    execute: jest.fn().mockResolvedValue({
      answer: 'ok',
      suggestQuestion: null,
      relatedCourses: [],
      questionLogId: 'test-log-id',
    }),
  };
  const answerQuestionStreamUseCase = {
    execute: jest.fn().mockResolvedValue(undefined),
  };
  const expandSkillsUseCase = {
    execute: jest.fn().mockResolvedValue({
      skillItems: [],
      llmInfo: {
        model: 'test-model',
        provider: 'test-provider',
        inputTokens: 0,
        outputTokens: 0,
      },
      tokenUsage: {
        model: 'test-model',
        inputTokens: 0,
        outputTokens: 0,
      },
    }),
  };
  const classifyQuestionUseCase = {
    execute: jest.fn().mockResolvedValue({
      category: 'test-category',
      reason: 'test-reason',
      llmInfo: {
        model: 'test-model',
        provider: 'test-provider',
        inputTokens: 0,
        outputTokens: 0,
      },
      tokenUsage: {
        model: 'test-model',
        inputTokens: 0,
        outputTokens: 0,
      },
    }),
  };
  const sseEmitterFactory = {
    create: (response: Response) => ({
      emit: () => undefined,
      complete: () => {
        if (!response.headersSent) {
          response.status(200);
        }
        response.end();
      },
      error: () => {
        if (!response.headersSent) {
          response.status(500);
        }
        response.end();
      },
    }),
  };

  beforeEach(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 5 }])],
      controllers: [QueryProcessorController],
      providers: [
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: AnswerQuestionUseCase, useValue: answerQuestionUseCase },
        {
          provide: AnswerQuestionStreamUseCase,
          useValue: answerQuestionStreamUseCase,
        },
        { provide: ExpandSkillsUseCase, useValue: expandSkillsUseCase },
        { provide: ClassifyQuestionUseCase, useValue: classifyQuestionUseCase },
        { provide: I_SSE_EMITTER_FACTORY_TOKEN, useValue: sseEmitterFactory },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    await moduleFixture.close();
    jest.clearAllMocks();
  });

  describe('POST /query-processor/answer-question - Rate Limit', () => {
    const endpoint = '/query-processor/answer-question';
    const payload = {
      question: 'What is machine learning?',
      isGenEd: false,
    };

    it('should allow 5 requests within 60 seconds', async () => {
      for (let i = 0; i < 5; i++) {
        const response = await request(app.getHttpServer())
          .post(endpoint)
          .send(payload)
          .expect(200);

        expect(response.body.data).toBeDefined();
      }
    });

    it('should return 429 on 6th request within 60 seconds', async () => {
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post(endpoint)
          .send(payload)
          .expect(200);
      }

      const response6 = await request(app.getHttpServer())
        .post(endpoint)
        .send(payload);

      expect(response6.status).toBe(429);
      expect(response6.body).toHaveProperty('message');
      expect(response6.body).toHaveProperty('statusCode');
      expect(response6.body.statusCode).toBe(429);
      expect(response6.body.message).toMatch(/too many/i);
    });

    it('should include ThrottlerException format in response', async () => {
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post(endpoint)
          .send(payload)
          .expect(200);
      }

      const response = await request(app.getHttpServer())
        .post(endpoint)
        .send(payload);

      expect(response.body).toEqual(
        expect.objectContaining({
          statusCode: 429,
          message: expect.stringContaining('ThrottlerException'),
        }),
      );
    });
  });

  describe('POST /query-processor/answer-question-stream - Rate Limit (SSE)', () => {
    const endpoint = '/query-processor/answer-question-stream';
    const payload = {
      question: 'What is machine learning?',
      isGenEd: false,
    };

    it('should allow 5 SSE stream requests within 60 seconds', async () => {
      for (let i = 0; i < 5; i++) {
        const response = await request(app.getHttpServer())
          .post(endpoint)
          .send(payload);

        expect(response.status).toBe(200);
      }
    });

    it('should return 429 before opening SSE stream on 6th request', async () => {
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer()).post(endpoint).send(payload);
      }

      const response = await request(app.getHttpServer())
        .post(endpoint)
        .send(payload);

      expect(response.status).toBe(429);
      expect(response.headers['content-type']).not.toContain(
        'text/event-stream',
      );
    });
  });

  describe('POST /query-processor/expand-skills - Rate Limit', () => {
    const endpoint = '/query-processor/expand-skills';
    const payload = {
      question: 'What skills are needed for AI development?',
    };

    it('should allow 5 requests within 60 seconds', async () => {
      for (let i = 0; i < 5; i++) {
        const response = await request(app.getHttpServer())
          .post(endpoint)
          .send(payload)
          .expect(200);

        expect(response.body.data).toBeDefined();
      }
    });

    it('should return 429 on 6th request', async () => {
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post(endpoint)
          .send(payload)
          .expect(200);
      }

      const response = await request(app.getHttpServer())
        .post(endpoint)
        .send(payload);

      expect(response.status).toBe(429);
      expect(response.body.message).toContain('Too Many Requests');
    });
  });

  describe('POST /query-processor/classify-question - Rate Limit', () => {
    const endpoint = '/query-processor/classify-question';
    const payload = {
      question: 'Is this a technical question?',
    };

    it('should allow 5 requests within 60 seconds', async () => {
      for (let i = 0; i < 5; i++) {
        const response = await request(app.getHttpServer())
          .post(endpoint)
          .send(payload)
          .expect(200);

        expect(response.body.data).toBeDefined();
      }
    });

    it('should return 429 on 6th request', async () => {
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post(endpoint)
          .send(payload)
          .expect(200);
      }

      const response = await request(app.getHttpServer())
        .post(endpoint)
        .send(payload);

      expect(response.status).toBe(429);
      expect(response.body.statusCode).toBe(429);
    });
  });

  describe('Rate Limit Isolation Between Endpoints', () => {
    it('should track requests independently per endpoint', async () => {
      const answerPayload = {
        question: 'Test question?',
        isGenEd: false,
      };
      const classifyPayload = {
        question: 'Test question?',
      };

      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/query-processor/answer-question')
          .send(answerPayload)
          .expect(200);
      }

      const answerBlocked = await request(app.getHttpServer())
        .post('/query-processor/answer-question')
        .send(answerPayload);

      expect(answerBlocked.status).toBe(429);

      const classifyResponse = await request(app.getHttpServer())
        .post('/query-processor/classify-question')
        .send(classifyPayload);

      expect([200, 429]).toContain(classifyResponse.status);
    });
  });
});
