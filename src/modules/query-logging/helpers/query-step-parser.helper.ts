import { Logger } from '@nestjs/common';

import type { CourseWithLearningOutcomeV2Match } from 'src/modules/course/types/course.type';

import type {
  AggregatedCourseSkills,
  CourseWithLearningOutcomeV2MatchWithRelevance,
} from '../../query-processor/types/course-aggregation.type';
import type {
  CourseMatchWithRelevanceMap,
  CourseRelevanceFilterResultV2,
} from '../../query-processor/types/course-relevance-filter.type';
import {
  AnswerSynthesisRawOutputSchema as ImportedAnswerSynthesisRawOutputSchema,
  ClassificationRawOutputSchema as ImportedClassificationRawOutputSchema,
  CourseAggregationRawOutputSchema as ImportedCourseAggregationRawOutputSchema,
  CourseRetrievalRawOutputSchema as ImportedCourseRetrievalRawOutputSchema,
  QueryProfileRawOutputSchema as ImportedQueryProfileRawOutputSchema,
  SkillExpansionRawOutputSchema as ImportedSkillExpansionRawOutputSchema,
} from '../schemas/query-log-raw-output.schema';
import type {
  AnswerSynthesisRawOutput,
  ClassificationRawOutput,
  CourseAggregationRawOutput,
  CourseRetrievalRawOutput,
  QueryProfileRawOutput,
  ServiceRawOutput,
  SkillExpansionRawOutput,
} from '../types/query-log-step.type';
import type { StepName } from '../types/query-status.type';
import { STEP_NAME } from '../types/query-status.type';

/**
 * Helper class for parsing query step outputs from JSONB storage.
 *
 * Handles:
 * 1. Type-safe parsing using Zod schemas
 * 2. Map reconstruction (Objects stored in JSONB → Maps)
 * 3. Discriminator-based type narrowing using STEP_NAME
 */
export class QueryStepParserHelper {
  private readonly logger = new Logger(QueryStepParserHelper.name);

  /**
   * Parse raw output based on stepName discriminator.
   * Returns properly typed ServiceRawOutput.
   */
  parseRawOutput(stepName: StepName, rawOutput: unknown): ServiceRawOutput {
    this.logger.debug(`Parsing raw output for step: ${stepName}`);

    switch (stepName) {
      case STEP_NAME.QUESTION_CLASSIFICATION:
        return this.parseClassificationRaw(rawOutput);

      case STEP_NAME.QUERY_PROFILE_BUILDING:
        return this.parseQueryProfileRaw(rawOutput);

      case STEP_NAME.SKILL_EXPANSION:
        return this.parseSkillExpansionRaw(rawOutput);

      case STEP_NAME.COURSE_RETRIEVAL:
        return this.parseCourseRetrievalRaw(rawOutput);

      case STEP_NAME.COURSE_RELEVANCE_FILTER:
        return this.parseCourseFilterRaw(rawOutput);

      case STEP_NAME.COURSE_AGGREGATION:
        return this.parseCourseAggregationRaw(rawOutput);

      case STEP_NAME.ANSWER_SYNTHESIS:
        return this.parseAnswerSynthesisRaw(rawOutput);

      default: {
        // TypeScript exhaustiveness check
        const _exhaustive: never = stepName;
        throw new Error(`Unknown stepName: ${String(_exhaustive)}`);
      }
    }
  }

  /**
   * Parse QUESTION_CLASSIFICATION raw output.
   */
  parseClassificationRaw(raw: unknown): ClassificationRawOutput {
    return ImportedClassificationRawOutputSchema.parse(raw);
  }

  /**
   * Parse QUERY_PROFILE_BUILDING raw output.
   */
  parseQueryProfileRaw(raw: unknown): QueryProfileRawOutput {
    return ImportedQueryProfileRawOutputSchema.parse(raw);
  }

  /**
   * Parse SKILL_EXPANSION raw output.
   */
  parseSkillExpansionRaw(raw: unknown): SkillExpansionRawOutput {
    return ImportedSkillExpansionRawOutputSchema.parse(raw);
  }

  /**
   * Parse COURSE_RETRIEVAL raw output.
   * Reconstructs Map from Object.
   */
  parseCourseRetrievalRaw(raw: unknown): CourseRetrievalRawOutput {
    const parsed = ImportedCourseRetrievalRawOutputSchema.parse(raw);

    // Reconstruct Map: Record<string, unknown> → Map<string, CourseWithLearningOutcomeV2Match[]>
    const skillCoursesMap = this.reconstructMap(
      parsed.skillCoursesMap as Record<
        string,
        CourseWithLearningOutcomeV2Match[]
      >,
    );

    return {
      ...parsed,
      skillCoursesMap,
    };
  }

  /**
   * Parse COURSE_RELEVANCE_FILTER raw output.
   * This is CourseRelevanceFilterResultV2 type from query-processor.
   * Maps are reconstructed from Objects.
   */
  parseCourseFilterRaw(raw: unknown): CourseRelevanceFilterResultV2 {
    // Type assertion is needed here since we're using the external type
    // In production, you'd want a proper Zod schema for CourseRelevanceFilterResultV2
    const parsed = raw as CourseRelevanceFilterResultV2;

    // ALWAYS reconstruct Maps to ensure type consistency
    // Even if the value is undefined/null, we want a proper Map type
    // Also preserve llmInfo and tokenUsage fields
    return {
      llmAcceptedCoursesBySkill: this.reconstructMap(
        (parsed.llmAcceptedCoursesBySkill as unknown as Record<
          string,
          CourseWithLearningOutcomeV2MatchWithRelevance[]
        >) || {},
      ) as CourseMatchWithRelevanceMap,
      llmRejectedCoursesBySkill: this.reconstructMap(
        (parsed.llmRejectedCoursesBySkill as unknown as Record<
          string,
          CourseWithLearningOutcomeV2MatchWithRelevance[]
        >) || {},
      ) as CourseMatchWithRelevanceMap,
      llmMissingCoursesBySkill: this.reconstructMap(
        (parsed.llmMissingCoursesBySkill as unknown as Record<
          string,
          CourseWithLearningOutcomeV2MatchWithRelevance[]
        >) || {},
      ) as CourseMatchWithRelevanceMap,
      // Preserve non-Map fields
      llmInfo: parsed.llmInfo,
      tokenUsage: parsed.tokenUsage,
    };
  }

  /**
   * Parse COURSE_AGGREGATION raw output.
   * Reconstructs Map from Object.
   */
  parseCourseAggregationRaw(raw: unknown): CourseAggregationRawOutput {
    const parsed = ImportedCourseAggregationRawOutputSchema.parse(raw);

    // Reconstruct Map: Record<string, unknown> → Map<string, CourseWithLearningOutcomeV2MatchWithRelevance[]>
    const filteredSkillCoursesMap = this.reconstructMap(
      parsed.filteredSkillCoursesMap as Record<
        string,
        CourseWithLearningOutcomeV2MatchWithRelevance[]
      >,
    );

    // rankedCourses is AggregatedCourseSkills[] - needs proper casting
    const rankedCourses = parsed.rankedCourses as AggregatedCourseSkills[];

    return {
      filteredSkillCoursesMap,
      rankedCourses,
    };
  }

  /**
   * Parse ANSWER_SYNTHESIS raw output.
   */
  parseAnswerSynthesisRaw(raw: unknown): AnswerSynthesisRawOutput {
    return ImportedAnswerSynthesisRawOutputSchema.parse(raw);
  }

  /**
   * Reconstruct a Map from a Record (Object) after JSONB deserialization.
   *
   * JSONB stores Maps as Objects. When reading from database,
   * we need to convert them back to Map type.
   *
   * @example
   * // In JSONB: {"python": [...], "javascript": [...]}
   * // Becomes: Map<string, Course[]>
   */
  reconstructMap<K extends string, V>(obj: Record<K, V>): Map<K, V> {
    return new Map(Object.entries(obj) as [K, V][]);
  }
}

/**
 * Singleton instance for use in services.
 */
export const queryStepParserHelper = new QueryStepParserHelper();
