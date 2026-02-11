import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { Response } from 'express';
import { I_SSE_EMITTER_FACTORY_TOKEN } from 'src/shared/adapters/sse/sse-emitter.factory';
import { ISseEmitter } from 'src/shared/contracts/sse/i-sse-emitter.contract';

import { AnswerQuestionStreamUseCase } from '../../../../../use-cases/answer-question-stream.use-case';
import { AnswerQuestionUseCase } from '../../../../../use-cases/answer-question.use-case';
import { ClassifyQuestionUseCase } from '../../../../../use-cases/classify-question.use-case';
import { ExpandSkillsUseCase } from '../../../../../use-cases/expand-skills.use-case';
import { AnswerQuestionRequestDto } from '../../dto/requests/answer-question.request.dto';
import { QueryProcessorController } from '../../query-processor.controller';

describe('QueryProcessorController - SSE Error Handling', () => {
  let controller: QueryProcessorController;
  let answerQuestionStreamUseCase: jest.Mocked<AnswerQuestionStreamUseCase>;
  let mockEmitter: jest.Mocked<ISseEmitter>;
  let mockResponse: jest.Mocked<Partial<Response>>;

  beforeEach(async () => {
    // Mock the use case
    answerQuestionStreamUseCase = {
      execute: jest.fn(),
    } as any;

    // Mock the SSE emitter
    mockEmitter = {
      emit: jest.fn(),
      complete: jest.fn(),
      error: jest.fn(),
    } as any;

    // Mock the emitter factory
    const mockSseEmitterFactory = {
      create: jest.fn().mockReturnValue(mockEmitter),
    };

    // Mock the non-stream use case (not used in SSE tests)
    const mockAnswerQuestionUseCase = {
      execute: jest.fn(),
    } as any;
    const mockClassifyQuestionUseCase = {
      execute: jest.fn(),
    } as any;
    const mockExpandSkillsUseCase = {
      execute: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QueryProcessorController],
      providers: [
        {
          provide: AnswerQuestionStreamUseCase,
          useValue: answerQuestionStreamUseCase,
        },
        {
          provide: AnswerQuestionUseCase,
          useValue: mockAnswerQuestionUseCase,
        },
        {
          provide: ClassifyQuestionUseCase,
          useValue: mockClassifyQuestionUseCase,
        },
        {
          provide: ExpandSkillsUseCase,
          useValue: mockExpandSkillsUseCase,
        },
        {
          provide: I_SSE_EMITTER_FACTORY_TOKEN,
          useValue: mockSseEmitterFactory,
        },
      ],
    }).compile();

    controller = module.get<QueryProcessorController>(QueryProcessorController);

    // Mock Express Response
    mockResponse = {
      writeHead: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
      removeListener: jest.fn(),
    };
  });

  describe('answerQuestionStream', () => {
    const validRequest: AnswerQuestionRequestDto = {
      question: 'What courses cover Python?',
      isGenEd: false,
      campusId: undefined,
      facultyId: undefined,
      academicYearSemesters: [],
    };

    // ============================================================
    // OPTION 1: Mock execute to throw error directly
    // ============================================================
    describe('when use case throws error', () => {
      it('should call emitter.error() when execute throws', async () => {
        // Arrange: Make execute throw an error
        const testError = new Error('LLM service failed');
        answerQuestionStreamUseCase.execute.mockRejectedValue(testError);

        // Act: Call the controller method
        await controller.answerQuestionStream(
          validRequest,
          mockResponse as Response,
        );

        // Assert: Verify error handling
        expect(answerQuestionStreamUseCase.execute).toHaveBeenCalled();
        expect(mockEmitter.error).toHaveBeenCalledWith(testError);
        expect(mockEmitter.complete).not.toHaveBeenCalled();
      });

      it('should handle HttpException errors', async () => {
        // Arrange: Use NestJS HttpException
        const httpError = new HttpException(
          'Service unavailable',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
        answerQuestionStreamUseCase.execute.mockRejectedValue(httpError);

        // Act
        await controller.answerQuestionStream(
          validRequest,
          mockResponse as Response,
        );

        // Assert
        expect(mockEmitter.error).toHaveBeenCalledWith(httpError);
      });

      it('should handle generic errors', async () => {
        // Arrange: Use generic Error
        const genericError = new Error('Database connection failed');
        answerQuestionStreamUseCase.execute.mockRejectedValue(genericError);

        // Act
        await controller.answerQuestionStream(
          validRequest,
          mockResponse as Response,
        );

        // Assert
        expect(mockEmitter.error).toHaveBeenCalledWith(genericError);
      });
    });

    // ============================================================
    // OPTION 2: Mock specific service to throw error
    // ============================================================
    describe('when specific service fails (via use case)', () => {
      it('should handle LLM service timeout errors', async () => {
        // Arrange: Simulate LLM timeout
        const timeoutError = new Error('Request timeout after 30000ms');
        timeoutError.name = 'TimeoutError';
        answerQuestionStreamUseCase.execute.mockRejectedValue(timeoutError);

        // Act
        await controller.answerQuestionStream(
          validRequest,
          mockResponse as Response,
        );

        // Assert
        expect(mockEmitter.error).toHaveBeenCalledWith(timeoutError);
      });

      it('should handle database errors', async () => {
        // Arrange: Simulate database error
        const dbError = new Error('Database connection lost');
        dbError.name = 'DatabaseError';
        answerQuestionStreamUseCase.execute.mockRejectedValue(dbError);

        // Act
        await controller.answerQuestionStream(
          validRequest,
          mockResponse as Response,
        );

        // Assert
        expect(mockEmitter.error).toHaveBeenCalledWith(dbError);
      });
    });

    // ============================================================
    // OPTION 3: Test successful execution for comparison
    // ============================================================
    describe('when execution succeeds', () => {
      it('should call emitter.complete() on success', async () => {
        // Arrange: Make execute succeed
        answerQuestionStreamUseCase.execute.mockResolvedValue(undefined);

        // Act
        await controller.answerQuestionStream(
          validRequest,
          mockResponse as Response,
        );

        // Assert
        expect(answerQuestionStreamUseCase.execute).toHaveBeenCalled();
        expect(mockEmitter.complete).toHaveBeenCalled();
        expect(mockEmitter.error).not.toHaveBeenCalled();
      });
    });

    // ============================================================
    // OPTION 4: Test with rejection scenarios
    // ============================================================
    describe('error propagation', () => {
      it('should propagate rejection reasons correctly', async () => {
        // Arrange: Test with rejection reason as Error
        const rejectionError = new Error('External API error');
        (rejectionError as any).statusCode = 502;
        answerQuestionStreamUseCase.execute.mockRejectedValue(rejectionError);

        // Act & Assert: Should catch and emit error
        await expect(
          controller.answerQuestionStream(
            validRequest,
            mockResponse as Response,
          ),
        ).resolves.not.toThrow(); // Controller handles the error

        expect(mockEmitter.error).toHaveBeenCalled();
      });
    });
  });
});
