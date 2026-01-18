import { plainToInstance } from 'class-transformer';
import { BaseMapperHelper } from 'src/shared/contracts/api/mappers/base-mapper.helper';
import { PaginationHelper } from 'src/shared/contracts/api/pagination/pagination.helper';
import {
  TokenLogger,
  type TokenMap,
} from 'src/shared/utils/token-logger.helper';

import type { QueryProcessStep } from 'src/modules/query-logging/types/query-log-step.type';
import type { QueryProcessLog } from 'src/modules/query-logging/types/query-log.type';
import type { QueryStatus } from 'src/modules/query-logging/types/query-status.type';
import { PIPELINE_STEPS } from 'src/modules/query-processor/configs/pipeline-steps.config';

import { QueryLogDetailResponseDto } from '../dto/responses/query-log-detail-response.dto';
import { QueryLogListItemResponseDto } from '../dto/responses/query-log-list-item.response.dto';
import { QueryLogStepDetailResponseDto } from '../dto/responses/query-log-step-detail.response.dto';
import { QueryLogsListResponseDto } from '../dto/responses/query-logs-list-response.dto';

/**
 * Query Log Response Mapper
 *
 * Transforms domain QueryProcessLog objects to response DTOs.
 * Follows CampusResponseMapper pattern with static methods and plainToInstance.
 *
 * Cost/token breakdown uses TokenLogger.getSummary() to separate LLM vs embedding.
 */
export class QueryLogResponseMapper {
  private static readonly EMBEDDING_STEP_KEY =
    PIPELINE_STEPS.COURSE_RETRIEVAL.TOKEN_KEY;

  /**
   * Map a single QueryProcessLog to list item DTO.
   * Lightweight representation with computed summaries.
   */
  static toListItemDto(log: QueryProcessLog): QueryLogListItemResponseDto {
    const itemDto: QueryLogListItemResponseDto = {
      id: log.id,
      question: log.question,
      status: log.status,
      createdAt: BaseMapperHelper.toIsoDate(log.createdAt) ?? '',
      startedAt: BaseMapperHelper.toIsoDate(log.startedAt) ?? '',
      completedAt: log.completedAt
        ? BaseMapperHelper.toIsoDate(log.completedAt)
        : null,
      duration: log.totalDuration
        ? BaseMapperHelper.msToSeconds(log.totalDuration)
        : null,
      costLlm: 0,
      costEmbedding: 0,
      costTotal: 0,
      tokensLlm: 0,
      tokensEmbedding: 0,
      tokensTotal: log.totalTokens ?? 0,
      courseCount: log.metrics?.counts?.coursesReturned ?? 0,
      skillCount: log.metrics?.counts?.skillsExtracted ?? 0,
      hasError: !!log.error,
    };

    // Parse tokenMap for LLM vs embedding breakdown
    const tokenMap = log.metrics?.tokenMap as TokenMap | undefined;
    if (tokenMap) {
      const summary = new TokenLogger().getSummary(tokenMap);

      for (const [categoryKey, categoryData] of Object.entries(
        summary.byCategory,
      )) {
        if (categoryKey === QueryLogResponseMapper.EMBEDDING_STEP_KEY) {
          itemDto.costEmbedding += categoryData.cost;
          itemDto.tokensEmbedding += categoryData.tokenCount.inputTokens;
        } else {
          itemDto.costLlm += categoryData.cost;
          itemDto.tokensLlm +=
            categoryData.tokenCount.inputTokens +
            categoryData.tokenCount.outputTokens;
        }
      }
    }

    // Total cost from scalar field (more accurate than summing breakdowns)
    itemDto.costTotal = log.totalCost ?? 0;

    return plainToInstance(QueryLogListItemResponseDto, itemDto, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Map array of QueryProcessLog to list item DTOs.
   */
  static toListItemDtoArray(
    logs: QueryProcessLog[],
  ): QueryLogListItemResponseDto[] {
    return logs.map((log) => QueryLogResponseMapper.toListItemDto(log));
  }

  /**
   * Map paginated logs to QueryLogsListResponseDto.
   */
  static toListResponseDto(
    logs: QueryProcessLog[],
    totalItems: number,
    page: number,
    pageSize: number,
    filters: {
      status?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
    },
  ): QueryLogsListResponseDto {
    const listDto: QueryLogsListResponseDto = {
      data: QueryLogResponseMapper.toListItemDtoArray(logs),
      pagination: PaginationHelper.buildPagination(totalItems, page, pageSize),
      filters: {
        status: (filters.status ?? null) as QueryStatus | null,
        startDate: filters.startDate ?? null,
        endDate: filters.endDate ?? null,
        search: filters.search ?? null,
      },
    };

    return plainToInstance(QueryLogsListResponseDto, listDto, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Map a single QueryProcessLog with steps to detail DTO.
   */
  static toDetailDto(
    log: QueryProcessLog,
    steps: QueryProcessStep[],
  ): QueryLogDetailResponseDto {
    // Transform timing: convert undefined to null for end/duration
    const transformedTiming = log.metrics?.timing
      ? Object.fromEntries(
          Object.entries(log.metrics.timing).map(([key, value]) => [
            key,
            {
              start: value.start,
              end: value.end ?? null,
              duration: value.duration ?? null,
            },
          ]),
        )
      : null;

    // Transform counts: convert undefined to null
    const transformedCounts = log.metrics?.counts
      ? {
          skillsExtracted: log.metrics.counts.skillsExtracted ?? null,
          coursesReturned: log.metrics.counts.coursesReturned ?? null,
        }
      : null;

    // Transform academicYearSemesters: flatten { academicYear, semesters: number[] } to { academicYear, semester }[]
    const flattenedSemesters =
      log.input?.academicYearSemesters
        ?.flatMap((filter) =>
          (filter.semesters ?? []).map((semester) => ({
            academicYear: filter.academicYear,
            semester,
          })),
        )
        .filter(
          (item): item is { academicYear: number; semester: number } =>
            item != null,
        ) ?? null;

    const detailDto: QueryLogDetailResponseDto = {
      id: log.id,
      question: log.question,
      status: log.status,
      input: log.input
        ? {
            question: log.input.question,
            campusId: log.input.campusId ?? null,
            facultyId: log.input.facultyId ?? null,
            isGenEd: log.input.isGenEd ?? null,
            academicYearSemesters: flattenedSemesters,
          }
        : null,
      output: log.output
        ? {
            answer: log.output.answer ?? null,
            suggestQuestion: log.output.suggestQuestion ?? null,
            relatedCourses: log.output.relatedCourses ?? null,
            classification: log.output.classification ?? null,
          }
        : null,
      metrics: log.metrics
        ? {
            timing: transformedTiming,
            tokenMap: log.metrics.tokenMap ?? null,
            counts: transformedCounts,
          }
        : null,
      summaries: QueryLogResponseMapper.toSummaryDto(log),
      error: log.error
        ? {
            code: log.error.code ?? null,
            message: log.error.message,
            stack: log.error.stack ?? null,
          }
        : null,
      metadata: log.metadata ?? null,
      createdAt: BaseMapperHelper.toIsoDate(log.createdAt) ?? '',
      startedAt: BaseMapperHelper.toIsoDate(log.startedAt) ?? '',
      completedAt: log.completedAt
        ? BaseMapperHelper.toIsoDate(log.completedAt)
        : null,
      updatedAt: BaseMapperHelper.toIsoDate(log.updatedAt) ?? '',
      steps: QueryLogResponseMapper.toStepDtoArray(steps),
    };

    return plainToInstance(QueryLogDetailResponseDto, detailDto, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Compute summary DTO from log (cost, tokens, duration).
   */
  private static toSummaryDto(log: QueryProcessLog) {
    const summary = {
      duration: log.totalDuration
        ? BaseMapperHelper.msToSeconds(log.totalDuration)
        : null,
      cost: {
        llm: 0,
        embedding: 0,
        total: log.totalCost ?? 0,
      },
      tokens: {
        llm: {
          input: 0,
          output: 0,
          total: 0,
        },
        embedding: {
          total: 0,
        },
        total: log.totalTokens ?? 0,
      },
    };

    // Parse tokenMap for breakdown
    const tokenMap = log.metrics?.tokenMap as TokenMap | undefined;
    if (tokenMap) {
      const tokenLogger = new TokenLogger();
      const tokenSummary = tokenLogger.getSummary(tokenMap);

      for (const [categoryKey, categoryData] of Object.entries(
        tokenSummary.byCategory,
      )) {
        if (categoryKey === QueryLogResponseMapper.EMBEDDING_STEP_KEY) {
          summary.cost.embedding += categoryData.cost;
          summary.tokens.embedding.total += categoryData.tokenCount.inputTokens;
        } else {
          summary.cost.llm += categoryData.cost;
          summary.tokens.llm.input += categoryData.tokenCount.inputTokens;
          summary.tokens.llm.output += categoryData.tokenCount.outputTokens;
        }
      }

      summary.tokens.llm.total =
        summary.tokens.llm.input + summary.tokens.llm.output;
    }

    return summary;
  }

  /**
   * Map QueryProcessStep array to step DTO array.
   */
  private static toStepDtoArray(
    steps: QueryProcessStep[],
  ): QueryLogStepDetailResponseDto[] {
    return steps.map((step) => {
      const stepDto: QueryLogStepDetailResponseDto = {
        id: step.id,
        stepName: step.stepName,
        stepOrder: step.stepOrder,
        input: step.input ?? null,
        output: step.output
          ? (step.output as unknown as Record<string, unknown>)
          : null,
        llm: step.llm
          ? {
              provider: step.llm.provider ?? null,
              model: step.llm.model ?? null,
              tokens: step.llm.tokenUsage
                ? {
                    input: step.llm.tokenUsage.input,
                    output: step.llm.tokenUsage.output,
                    total: step.llm.tokenUsage.total,
                  }
                : null,
              cost: step.llm.cost ?? null,
            }
          : null,
        embedding: step.embedding
          ? {
              model: step.embedding.model ?? null,
              provider: step.embedding.provider ?? null,
              dimension: step.embedding.dimension ?? null,
              totalTokens: step.embedding.totalTokens ?? null,
            }
          : null,
        metrics: step.metrics
          ? {
              duration: step.metrics.duration ?? 0,
            }
          : null,
        error: step.error
          ? {
              code: step.error.code ?? null,
              message: step.error.message,
              details: step.error.details,
            }
          : null,
        startedAt: BaseMapperHelper.toIsoDate(step.startedAt) ?? '',
        completedAt: step.completedAt
          ? BaseMapperHelper.toIsoDate(step.completedAt)
          : null,
        duration: step.duration ?? null,
      };

      return plainToInstance(QueryLogStepDetailResponseDto, stepDto, {
        excludeExtraneousValues: true,
      });
    });
  }
}
