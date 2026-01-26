import { Injectable, Logger } from '@nestjs/common';

import { FileHelper } from 'src/shared/utils/file';

import type {
  EvaluateRetrieverOutput,
  EvaluationItem,
  RelevanceScore,
} from '../types/course-retrieval.types';
import { CourseRetrievalMetricsCalculator } from './course-retrieval-metrics-calculator.service';

// ============================================================================
// TYPES
// ============================================================================

interface MigrationResult {
  success: boolean;
  recordsMigrated: number;
  backupPath?: string;
  dryRun?: boolean;
  changes?: MigrationChange[];
}

interface MigrationChange {
  type: 'precision' | 'ndcg' | 'other';
  field: string;
  before: string;
  after: string;
}

// ============================================================================
// MIGRATOR SERVICE
// ============================================================================

@Injectable()
export class CourseRetrievalMetricsMigratorService {
  private readonly logger = new Logger(
    CourseRetrievalMetricsMigratorService.name,
  );

  /**
   * Migrate iteration records from old single-threshold precision to multi-threshold
   *
   * @param params.testSetName - Test set identifier
   * @param params.iterationNumber - Iteration number to migrate
   * @param params.dryRun - Show changes without writing (default: false)
   * @param params.backup - Create backup before overwriting (default: false)
   * @returns Migration result with statistics
   */
  async migrateIteration(params: {
    testSetName: string;
    iterationNumber: number;
    dryRun?: boolean;
    backup?: boolean;
  }): Promise<MigrationResult> {
    const {
      testSetName,
      iterationNumber,
      dryRun = false,
      backup = false,
    } = params;

    if (!dryRun) {
      this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      this.logger.log('Course Retrieval Metrics Migration');
      this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      this.logger.log(
        `Test Set: ${testSetName} | Iteration: ${iterationNumber}`,
      );
      this.logger.log(
        `Dry Run: ${dryRun ? 'YES' : 'NO'} | Backup: ${backup ? 'YES' : 'NO'}`,
      );
      this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    if (dryRun) {
      this.logger.log(`Course Retrieval Metrics Migration (DRY RUN)`);
      this.logger.log(
        `Test Set: ${testSetName} | Iteration: ${iterationNumber}`,
      );
      this.logger.log(`Backup: ${backup ? 'YES' : 'NO'}`);
    }

    // 1. Validate test set exists
    const baseDir = `data/evaluation/course-retriever/${testSetName}`;
    const recordsPath = `${baseDir}/records/records-iteration-${iterationNumber}.json`;

    if (!FileHelper.exists(recordsPath)) {
      throw new Error(`Records file not found: ${recordsPath}`);
    }

    // 2. Load existing records
    const existingRecords =
      await FileHelper.loadJson<EvaluateRetrieverOutput[]>(recordsPath);

    if (existingRecords.length === 0) {
      throw new Error(`No records found in: ${recordsPath}`);
    }

    // 3. Migrate each record
    const changes: MigrationChange[] = [];
    const migratedRecords: EvaluateRetrieverOutput[] = [];

    for (const record of existingRecords) {
      const oldMetrics = record.metrics;
      const migratedRecord = this.migrateRecord(record);
      const newMetrics = migratedRecord.metrics;

      // Track changes for dry-run preview
      if (oldMetrics.precision.at5 !== newMetrics.precision.at5) {
        changes.push({
          type: 'precision',
          field: 'precision.at5',
          before: JSON.stringify(oldMetrics.precision.at5),
          after: JSON.stringify(newMetrics.precision.at5),
        });
      }

      migratedRecords.push(migratedRecord);
    }

    // 4. Dry run - just show what would change
    if (dryRun) {
      this.displayDryRunSummary(existingRecords, migratedRecords, changes);
      return {
        success: true,
        recordsMigrated: migratedRecords.length,
        dryRun: true,
        changes,
      };
    }

    // 5. Create backup if requested
    let backupPath: string | undefined;
    if (backup) {
      this.logger.log('Creating backup...');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      backupPath = `${recordsPath}.backup-${timestamp}`;

      await FileHelper.saveJson(backupPath, existingRecords);
      this.logger.log(`Backup created: ${backupPath}`);
    }

    // 6. Write migrated records
    this.logger.log(`Writing migrated records to: ${recordsPath}`);
    await FileHelper.saveJson(recordsPath, migratedRecords);

    // 7. Re-aggregate iteration metrics
    this.logger.log('Re-aggregating iteration metrics...');
    const iterationMetrics =
      CourseRetrievalMetricsCalculator.calculateMeanMetrics(migratedRecords);

    const enrichedMetrics =
      CourseRetrievalMetricsCalculator.buildEnrichedIterationMetrics({
        metrics: iterationMetrics,
        sampleCount: migratedRecords.length,
        iterationNumber,
      });

    const metricsPath = `${baseDir}/metrics/metrics-iteration-${iterationNumber}.json`;
    this.logger.log(`Writing updated metrics to: ${metricsPath}`);
    await FileHelper.saveJson(metricsPath, enrichedMetrics);

    // 8. Update final metrics if exists
    const finalMetricsPath = `${baseDir}/final-metrics.json`;
    if (FileHelper.exists(finalMetricsPath)) {
      this.logger.log('Updating final metrics...');
      this.logger.log(`Final metrics at: ${finalMetricsPath}`);
      this.logger.log(
        'Note: Run full aggregation with --iterations to update all final metrics',
      );
    }

    this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.logger.log('✅ Migration complete!');
    this.logger.log(`Migrated ${migratedRecords.length} records`);
    if (backupPath) {
      this.logger.log(`Backup: ${backupPath}`);
    }
    this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return {
      success: true,
      recordsMigrated: migratedRecords.length,
      backupPath,
      changes,
    };
  }

  /**
   * Migrate a single record from old to new precision format
   *
   * @param record - Original record with old metrics
   * @returns Migrated record with new multi-threshold precision
   */
  private migrateRecord(
    record: EvaluateRetrieverOutput,
  ): EvaluateRetrieverOutput {
    // Map to evaluation items format
    const evaluations: EvaluationItem[] = record.evaluations.map(
      (evaluation) => ({
        subjectCode: evaluation.subjectCode,
        subjectName: evaluation.subjectName,
        relevanceScore: evaluation.relevanceScore as RelevanceScore,
        reason: evaluation.reason,
      }),
    );

    // Recalculate metrics with new multi-threshold precision
    const newMetrics =
      CourseRetrievalMetricsCalculator.calculateMetrics(evaluations);

    return {
      ...record,
      metrics: newMetrics,
    };
  }

  /**
   * Display dry-run summary showing what would change
   */
  private displayDryRunSummary(
    originalRecords: EvaluateRetrieverOutput[],
    migratedRecords: EvaluateRetrieverOutput[],
    changes: MigrationChange[],
  ): void {
    this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.logger.log('DRY RUN - PREVIEW OF CHANGES');
    this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Show summary
    this.logger.log('');
    this.logger.log('Migration Summary:');
    this.logger.log(`  Total records: ${migratedRecords.length}`);
    this.logger.log(`  Fields to update: ${changes.length}`);

    // Show one sample change
    if (changes.length > 0) {
      this.logger.log('');
      this.logger.log('Sample Change (first record):');
      this.logger.log(`  Field: ${changes[0].field}`);

      const newRecord = migratedRecords[0];
      if (typeof newRecord.metrics.precision.at5 !== 'number') {
        this.logger.log('  New precision format (sample):');
        const precisionAt5 = newRecord.metrics.precision.at5;
        this.logger.log(
          `    threshold1 (≥1): ${precisionAt5.threshold1.toFixed(4)}`,
        );
        this.logger.log(
          `    threshold2 (≥2): ${precisionAt5.threshold2.toFixed(4)}`,
        );
        this.logger.log(
          `    threshold3 (≥3): ${precisionAt5.threshold3.toFixed(4)}`,
        );
      }
    }

    // Show aggregated metrics
    const newIterationMetrics =
      CourseRetrievalMetricsCalculator.calculateMeanMetrics(migratedRecords);

    this.logger.log('');
    this.logger.log('Aggregated Metrics (mean across all records):');

    if (typeof newIterationMetrics.precision.at5 !== 'number') {
      this.logger.log('  precision.at5:');
      const precisionAt5 = newIterationMetrics.precision.at5;
      this.logger.log(
        `    threshold1 (≥1): ${precisionAt5.threshold1.toFixed(4)}`,
      );
      this.logger.log(
        `    threshold2 (≥2): ${precisionAt5.threshold2.toFixed(4)}`,
      );
      this.logger.log(
        `    threshold3 (≥3): ${precisionAt5.threshold3.toFixed(4)}`,
      );
    }

    this.logger.log('');
    this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.logger.log(`This is a DRY RUN - no files will be modified`);
    this.logger.log(
      `Total records that would be migrated: ${migratedRecords.length}`,
    );
    this.logger.log(`Total fields that would change: ${changes.length}`);
    this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }
}
