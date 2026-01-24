import { Injectable, Logger } from '@nestjs/common';

import * as path from 'node:path';
import { FileHelper } from 'src/shared/utils/file';

import {
  CourseRetrievalProgressFile,
  EvaluateRetrieverOutput,
} from '../types/course-retrieval.types';

/**
 * Service for managing evaluation result files
 *
 * Handles file I/O operations for course retrieval evaluations.
 * Simplified to work with single-score evaluation model.
 *
 * Output structure:
 * data/evaluation/course-retriever/
 * └── {testSetName}/
 *     ├── records/
 *     │   └── records-iteration-{N}.json
 *     └── progress/
 *         └── progress-iteration-{N}.json
 */
@Injectable()
export class CourseRetrievalResultManagerService {
  private readonly logger = new Logger(
    CourseRetrievalResultManagerService.name,
  );
  private readonly baseDir = 'data/evaluation/course-retriever';

  /**
   * Ensure the directory structure exists for a test set
   *
   * Creates: records/, progress/
   *
   * @param testSetName - Test set identifier
   */
  async ensureDirectoryStructure(testSetName: string): Promise<void> {
    const baseDir = path.join(this.baseDir, testSetName);
    const subdirs = ['records', 'progress'];

    for (const subdir of subdirs) {
      const dirPath = path.join(baseDir, subdir);
      await FileHelper.saveJson(path.join(dirPath, '.gitkeep'), '');
    }

    this.logger.log(`Ensured directory structure for ${testSetName}`);
  }

  /**
   * Save iteration records to file
   *
   * @param testSetName - Test set identifier (e.g., 'test-set-v1')
   * @param iterationNumber - Current iteration number
   * @param records - Array of evaluation results for this iteration
   */
  async saveIterationRecords(params: {
    testSetName: string;
    iterationNumber: number;
    records: EvaluateRetrieverOutput[];
  }): Promise<void> {
    const { testSetName, iterationNumber, records } = params;
    const filePath = path.join(
      this.baseDir,
      testSetName,
      'records',
      `records-iteration-${iterationNumber}.json`,
    );

    await FileHelper.saveJson(filePath, records);
    this.logger.log(`Saved ${records.length} records to ${filePath}`);
  }

  /**
   * Load progress file for crash recovery
   *
   * @param testSetName - Test set identifier
   * @param iterationNumber - Iteration number
   * @returns Progress file or creates new one if not found
   */
  async loadProgress(params: {
    testSetName: string;
    iterationNumber: number;
  }): Promise<CourseRetrievalProgressFile> {
    const { testSetName, iterationNumber } = params;
    const filePath = path.join(
      this.baseDir,
      testSetName,
      'progress',
      `progress-iteration-${iterationNumber}.json`,
    );

    try {
      return await FileHelper.loadJson<CourseRetrievalProgressFile>(filePath);
    } catch {
      // Return new progress file if not found
      return {
        testSetName,
        iterationNumber,
        entries: [],
        lastUpdated: new Date().toISOString(),
        statistics: {
          totalItems: 0,
          completedItems: 0,
          pendingItems: 0,
          completionPercentage: 0,
        },
      };
    }
  }

  /**
   * Save progress file for crash recovery
   *
   * @param progress - Progress file to save
   */
  async saveProgress(progress: CourseRetrievalProgressFile): Promise<void> {
    const filePath = path.join(
      this.baseDir,
      progress.testSetName,
      'progress',
      `progress-iteration-${progress.iterationNumber}.json`,
    );

    progress.lastUpdated = new Date().toISOString();
    progress.statistics.completedItems = progress.entries.length;
    progress.statistics.pendingItems =
      progress.statistics.totalItems - progress.entries.length;
    progress.statistics.completionPercentage =
      progress.statistics.totalItems > 0
        ? (progress.entries.length / progress.statistics.totalItems) * 100
        : 0;

    await FileHelper.saveJson(filePath, progress);
    this.logger.debug(
      `Saved progress: ${progress.statistics.completionPercentage.toFixed(1)}% complete (${progress.entries.length}/${progress.statistics.totalItems})`,
    );
  }

  /**
   * Load iteration records from file
   *
   * @param testSetName - Test set identifier
   * @param iterationNumber - Iteration number to load
   * @returns Array of evaluation records
   */
  async loadIterationRecords(params: {
    testSetName: string;
    iterationNumber: number;
  }): Promise<EvaluateRetrieverOutput[]> {
    const { testSetName, iterationNumber } = params;
    const filePath = path.join(
      this.baseDir,
      testSetName,
      'records',
      `records-iteration-${iterationNumber}.json`,
    );

    return FileHelper.loadJson<EvaluateRetrieverOutput[]>(filePath);
  }
}
