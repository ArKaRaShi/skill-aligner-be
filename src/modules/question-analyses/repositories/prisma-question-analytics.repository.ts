import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/shared/kernel/database';

import { IQuestionAnalyticsRepository } from '../contracts/repositories/i-question-analytics-repository.contract';
import {
  EntityDetailsRaw,
  LifetimeStatsRaw,
  QualityDistributionRaw,
  QuestionWithEntitiesRaw,
  TopQuestionRaw,
  TrendingResultRaw,
} from '../contracts/repositories/types/analytics-query.types';
import type {
  EntityQuestionExamples,
  EntityType,
  ExampleQuestion,
  LifetimeStats,
  QualityDistribution,
  TopQuestion,
  TrendingResult,
} from '../types';

@Injectable()
export class PrismaQuestionAnalyticsRepository
  implements IQuestionAnalyticsRepository
{
  private readonly DEFAULT_LIMIT = 20;

  constructor(private readonly prisma: PrismaService) {}

  async getTrending(
    entityType: EntityType,
    startDate: Date,
    endDate: Date,
    limit = this.DEFAULT_LIMIT,
  ): Promise<TrendingResult[]> {
    const rows = await this.prisma.$queryRaw<TrendingResultRaw[]>`
      SELECT normalized_label, COUNT(*) as count
      FROM extracted_entities
      WHERE type = ${entityType}::entity_type
        AND created_at >= ${startDate}
        AND created_at <= ${endDate}
      GROUP BY normalized_label
      ORDER BY count DESC
      LIMIT ${limit}
    `;

    return rows.map((row) => ({
      entityType,
      normalizedLabel: row.normalized_label,
      count: Number(row.count),
      period: { start: startDate, end: endDate },
    }));
  }

  async getEntityQuestionExamples(
    entityType: EntityType,
    normalizedLabel: string,
    limit = this.DEFAULT_LIMIT,
  ): Promise<EntityQuestionExamples> {
    // First, get the entity details (name, type) from a recent extraction
    const entityRow = await this.prisma.$queryRaw<EntityDetailsRaw[]>`
      SELECT name, normalized_label, type
      FROM extracted_entities
      WHERE type = ${entityType}::entity_type
        AND normalized_label = ${normalizedLabel}
      LIMIT 1
    `;

    if (!entityRow[0]) {
      return {
        entity: {
          type: entityType,
          normalizedLabel,
          name: normalizedLabel, // Fallback to label if not found
        },
        examples: [],
        totalQuestions: 0,
      };
    }

    // Get example questions containing this entity
    const questionRows = await this.prisma.$queryRaw<QuestionWithEntitiesRaw[]>`
      SELECT DISTINCT
        ql.id as question_log_id,
        ql.question_text,
        MIN(ee.created_at) as extracted_at,
        ee.type as entity_type,
        ee.name as entity_name,
        ee.normalized_label as entity_normalized_label
      FROM question_logs ql
      INNER JOIN question_log_analyses qla ON qla.question_log_id = ql.id
      INNER JOIN extracted_entities ee ON ee.analysis_id = qla.id
      WHERE ee.type = ${entityType}::entity_type
        AND ee.normalized_label = ${normalizedLabel}
      GROUP BY ql.id, ql.question_text, ee.type, ee.name, ee.normalized_label
      ORDER BY extracted_at DESC
      LIMIT ${limit * 2}
    `;

    // Group by question log and collect entities
    const questionMap = new Map<string, ExampleQuestion>();

    for (const row of questionRows) {
      const existing = questionMap.get(row.question_log_id);

      if (existing) {
        // Add entity to existing question
        existing.entities.push({
          type: row.entity_type as EntityType,
          name: row.entity_name,
          normalizedLabel: row.entity_normalized_label,
        });
      } else {
        // Create new question entry
        questionMap.set(row.question_log_id, {
          questionLogId: row.question_log_id,
          questionText: row.question_text,
          extractedAt: row.extracted_at,
          entities: [
            {
              type: row.entity_type as EntityType,
              name: row.entity_name,
              normalizedLabel: row.entity_normalized_label,
            },
          ],
        });
      }

      // Stop once we have enough unique questions
      if (questionMap.size >= limit) {
        break;
      }
    }

    const examples = Array.from(questionMap.values()).slice(0, limit);

    return {
      entity: {
        type: entityType,
        normalizedLabel,
        name: entityRow[0].name,
      },
      examples,
      totalQuestions: examples.length,
    };
  }

  async getLifetimeStats(): Promise<LifetimeStats> {
    const stats = await this.prisma.$queryRaw<LifetimeStatsRaw[]>`
      SELECT
        COUNT(*) as total_extractions,
        COALESCE(SUM(extraction_cost), 0) as total_cost,
        COALESCE(SUM(tokens_used), 0) as total_tokens,
        COUNT(DISTINCT question_log_id) as total_questions,
        SUM(CASE WHEN overall_quality = 'high' THEN 1 ELSE 0 END) as high_quality,
        SUM(CASE WHEN overall_quality = 'medium' THEN 1 ELSE 0 END) as medium_quality,
        SUM(CASE WHEN overall_quality = 'low' THEN 1 ELSE 0 END) as low_quality,
        SUM(CASE WHEN overall_quality = 'none' THEN 1 ELSE 0 END) as none_quality
      FROM question_log_analyses
    `;

    const row = stats[0];

    return {
      totalExtractions: Number(row.total_extractions),
      totalCost: Number(row.total_cost),
      averageTokensPerExtraction:
        Number(row.total_extractions) > 0
          ? Number(row.total_tokens) / Number(row.total_extractions)
          : 0,
      totalQuestionsProcessed: Number(row.total_questions),
      qualityDistribution: {
        high: Number(row.high_quality),
        medium: Number(row.medium_quality),
        low: Number(row.low_quality),
        none: Number(row.none_quality),
      },
    };
  }

  async getQualityDistribution(): Promise<QualityDistribution> {
    const rows = await this.prisma.$queryRaw<QualityDistributionRaw[]>`
      SELECT overall_quality, COUNT(*) as count
      FROM question_log_analyses
      GROUP BY overall_quality
    `;

    const distribution: QualityDistribution = {
      high: 0,
      medium: 0,
      low: 0,
      none: 0,
    };

    for (const row of rows) {
      distribution[row.overall_quality as keyof QualityDistribution] = Number(
        row.count,
      );
    }

    return distribution;
  }

  async getTopQuestions(limit = this.DEFAULT_LIMIT): Promise<TopQuestion[]> {
    const rows = await this.prisma.$queryRaw<TopQuestionRaw[]>`
      SELECT
        ql.id as question_log_id,
        ql.question_text,
        COUNT(qla.id) as extraction_count,
        MAX(qla.extracted_at) as last_extracted_at
      FROM question_logs ql
      INNER JOIN question_log_analyses qla ON qla.question_log_id = ql.id
      GROUP BY ql.id, ql.question_text
      ORDER BY extraction_count DESC, last_extracted_at DESC
      LIMIT ${limit}
    `;

    return rows.map((row) => ({
      questionLogId: row.question_log_id,
      questionText: row.question_text,
      extractionCount: Number(row.extraction_count),
      lastExtractedAt: row.last_extracted_at,
    }));
  }
}
