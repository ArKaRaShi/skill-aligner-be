import { FileHelper } from 'src/shared/utils/file';

import {
  createMockAggregateMetrics,
  createMockContextMismatchEntry,
  createMockEnhancedIterationMetrics,
  createMockFinalMetrics,
} from '../../__tests__/course-retrieval.fixture';
import { EvaluationResultsRepository } from '../evaluation-results.repository';

// Mock FileHelper
jest.mock('src/shared/utils/file');

// Mock path.join to return predictable paths
jest.mock('node:path', () => ({
  join: (...parts: string[]) => parts.filter(Boolean).join('/'),
}));

describe('EvaluationResultsRepository', () => {
  let repository: EvaluationResultsRepository;
  let mockLogger: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Logger
    mockLogger = {
      log: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    // Create repository instance
    repository = new EvaluationResultsRepository();
    (repository as any).logger = mockLogger;
  });

  describe('ensureDirectoryStructure', () => {
    it('should create all required subdirectories', async () => {
      // Arrange
      (FileHelper.saveJson as jest.Mock).mockResolvedValue(undefined);

      // Act
      await repository.ensureDirectoryStructure('test-set-v1');

      // Assert
      expect(FileHelper.saveJson).toHaveBeenCalledTimes(5);
      const calls = (FileHelper.saveJson as jest.Mock).mock.calls;
      const paths = calls.map((call) => call[0] as string);

      expect(paths).toContain(
        'data/evaluation/course-retriever/test-set-v1/metrics/.gitkeep',
      );
      expect(paths).toContain(
        'data/evaluation/course-retriever/test-set-v1/records/.gitkeep',
      );
      expect(paths).toContain(
        'data/evaluation/course-retriever/test-set-v1/test-case-metrics/.gitkeep',
      );
      expect(paths).toContain(
        'data/evaluation/course-retriever/test-set-v1/aggregate-metrics/.gitkeep',
      );
      expect(paths).toContain(
        'data/evaluation/course-retriever/test-set-v1/misalignments/.gitkeep',
      );
    });

    it('should log directory creation', async () => {
      // Arrange
      (FileHelper.saveJson as jest.Mock).mockResolvedValue(undefined);

      // Act
      await repository.ensureDirectoryStructure('test-set-v1');

      // Assert
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Ensured directory structure for test-set-v1',
      );
    });
  });

  describe('saveIterationRecords', () => {
    it('should save iteration records with correct filename', async () => {
      // Arrange
      const records = [
        { testCaseId: 'tc1', question: 'Test?', skill: 'python' },
        { testCaseId: 'tc2', question: 'Test?', skill: 'java' },
      ] as any;
      (FileHelper.saveJson as jest.Mock).mockResolvedValue(undefined);

      // Act
      await repository.saveIterationRecords({
        testSetName: 'test-set-v1',
        iterationNumber: 1,
        records,
      });

      // Assert
      expect(FileHelper.saveJson).toHaveBeenCalledWith(
        'data/evaluation/course-retriever/test-set-v1/records/records-iteration-1.json',
        records,
      );
    });

    it('should log record count', async () => {
      // Arrange
      const records = [
        { testCaseId: 'tc1' },
        { testCaseId: 'tc2' },
        { testCaseId: 'tc3' },
        { testCaseId: 'tc4' },
        { testCaseId: 'tc5' },
      ] as any;
      (FileHelper.saveJson as jest.Mock).mockResolvedValue(undefined);

      // Act
      await repository.saveIterationRecords({
        testSetName: 'test-set-v1',
        iterationNumber: 1,
        records,
      });

      // Assert
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Saved 5 records'),
      );
    });
  });

  describe('saveIterationMetrics', () => {
    it('should save iteration metrics with correct filename', async () => {
      // Arrange
      const metrics = createMockEnhancedIterationMetrics({
        iterationNumber: 2,
      });
      (FileHelper.saveJson as jest.Mock).mockResolvedValue(undefined);

      // Act
      await repository.saveIterationMetrics({
        testSetName: 'test-set-v1',
        iterationNumber: 2,
        metrics,
      });

      // Assert
      expect(FileHelper.saveJson).toHaveBeenCalledWith(
        'data/evaluation/course-retriever/test-set-v1/metrics/metrics-iteration-2.json',
        metrics,
      );
    });

    it('should log metrics save', async () => {
      // Arrange
      const metrics = createMockEnhancedIterationMetrics();
      (FileHelper.saveJson as jest.Mock).mockResolvedValue(undefined);

      // Act
      await repository.saveIterationMetrics({
        testSetName: 'test-set-v1',
        iterationNumber: 1,
        metrics,
      });

      // Assert
      expect(mockLogger.log).toHaveBeenCalled();
    });
  });

  describe('saveTestCaseMetrics', () => {
    it('should save test case metrics with correct filename', async () => {
      // Arrange
      const testCaseMetrics = [
        createMockEnhancedIterationMetrics(),
        createMockEnhancedIterationMetrics(),
        createMockEnhancedIterationMetrics(),
      ] as any;
      (FileHelper.saveJson as jest.Mock).mockResolvedValue(undefined);

      // Act
      await repository.saveTestCaseMetrics({
        testSetName: 'test-set-v1',
        iterationNumber: 1,
        testCaseMetrics,
      });

      // Assert
      expect(FileHelper.saveJson).toHaveBeenCalledWith(
        'data/evaluation/course-retriever/test-set-v1/test-case-metrics/test-case-metrics-iteration-1.json',
        testCaseMetrics,
      );
    });

    it('should log test case count', async () => {
      // Arrange
      const testCaseMetrics = [
        { testCaseId: 'tc1' },
        { testCaseId: 'tc2' },
        { testCaseId: 'tc3' },
      ] as any;
      (FileHelper.saveJson as jest.Mock).mockResolvedValue(undefined);

      // Act
      await repository.saveTestCaseMetrics({
        testSetName: 'test-set-v1',
        iterationNumber: 1,
        testCaseMetrics,
      });

      // Assert
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Saved 3 test case metrics'),
      );
    });
  });

  describe('saveContextMismatches', () => {
    it('should save context mismatches to correct file', async () => {
      // Arrange
      const mismatches = [
        createMockContextMismatchEntry({
          question: 'Test 1',
          mismatches: [
            {
              courseCode: 'CS101',
              courseName: 'Course 1',
              skillRelevance: 3,
              contextAlignment: 0,
            },
          ],
        }),
        createMockContextMismatchEntry({
          question: 'Test 2',
          mismatches: [
            {
              courseCode: 'CS201',
              courseName: 'Course 2',
              skillRelevance: 2,
              contextAlignment: 1,
            },
          ],
        }),
      ];
      (FileHelper.appendToJsonArray as jest.Mock).mockResolvedValue(undefined);

      // Act
      await repository.saveContextMismatches({
        testSetName: 'test-set-v1',
        mismatches,
      });

      // Assert
      expect(FileHelper.appendToJsonArray).toHaveBeenCalledTimes(2);
      expect(FileHelper.appendToJsonArray).toHaveBeenCalledWith(
        'data/evaluation/course-retriever/test-set-v1/misalignments/context-mismatches.json',
        mismatches[0],
      );
      expect(FileHelper.appendToJsonArray).toHaveBeenCalledWith(
        'data/evaluation/course-retriever/test-set-v1/misalignments/context-mismatches.json',
        mismatches[1],
      );
    });

    it('should skip saving when mismatches array is empty', async () => {
      // Arrange
      const mismatches: any[] = [];

      // Act
      await repository.saveContextMismatches({
        testSetName: 'test-set-v1',
        mismatches,
      });

      // Assert
      expect(FileHelper.appendToJsonArray).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'No context mismatches to save',
      );
    });

    it('should append each mismatch individually', async () => {
      // Arrange
      const mismatches = [
        createMockContextMismatchEntry(),
        createMockContextMismatchEntry(),
      ];
      (FileHelper.appendToJsonArray as jest.Mock).mockResolvedValue(undefined);

      // Act
      await repository.saveContextMismatches({
        testSetName: 'test-set-v1',
        mismatches,
      });

      // Assert
      expect(FileHelper.appendToJsonArray).toHaveBeenCalledTimes(2);
    });
  });

  describe('saveAggregateMetrics', () => {
    it('should save aggregate metrics with correct filename', async () => {
      // Arrange
      const metrics = createMockAggregateMetrics();
      (FileHelper.saveJson as jest.Mock).mockResolvedValue(undefined);

      // Act
      await repository.saveAggregateMetrics({
        testSetName: 'test-set-v1',
        totalIterations: 3,
        testSetSize: 10,
        metrics,
      });

      // Assert
      expect(FileHelper.saveJson).toHaveBeenCalledWith(
        'data/evaluation/course-retriever/test-set-v1/aggregate-metrics/aggregate-metrics-3-10.json',
        metrics,
      );
    });
  });

  describe('saveFinalMetrics', () => {
    it('should save final metrics with correct filename', async () => {
      // Arrange
      const metrics = createMockFinalMetrics();
      (FileHelper.saveJson as jest.Mock).mockResolvedValue(undefined);

      // Act
      await repository.saveFinalMetrics({
        testSetName: 'test-set-v1',
        totalIterations: 5,
        testSetSize: 20,
        metrics,
      });

      // Assert
      expect(FileHelper.saveJson).toHaveBeenCalledWith(
        'data/evaluation/course-retriever/test-set-v1/aggregate-metrics/final-metrics-5-20.json',
        metrics,
      );
    });
  });
});
