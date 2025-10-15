import { PrismaClient } from '@prisma/client';

import path from 'path';

import { SemanticsApiClient } from './common/adapters/secondary';
import { FileHelper } from './common/helpers/file';

const prisma = new PrismaClient();

type VectorSearchRow = {
  course_id: string;
  subject_code: string;
  subject_name_th: string;
  academic_year: number;
  semester: number;
  clo_id: string;
  clo_name_th: string;
  clo_metadata: Record<string, any> | null;
  similarity: number;
};

export type Payload = {
  courseId: string;
  subjectCode: string;
  subjectNameTh: string;
  academicYear: number;
  semester: number;
  cloId: string;
  cloNameTh: string;
  similarity: number;
  cloMetadata?: Record<string, any> | null;
};

export type PayloadWithMetadata = {
  metadata: {
    model: string;
    dimension: number;
    embeddedAt: string;
    queryText: string;
    generatedAt: string;
    perCourseMaxRank: number;
    uniqueCLOs: number;
  };
  results: Payload[];
};

function buildPayloadWithMetadata(
  rows: VectorSearchRow[],
  queryText: string,
  embeddingData: {
    model: string;
    dimension: number;
    embedded_at: string;
  },
) {
  return {
    metadata: {
      model: embeddingData.model,
      dimension: embeddingData.dimension,
      embeddedAt: embeddingData.embedded_at,
      queryText,
      generatedAt: new Date().toISOString(),
      perCourseMaxRank: 3,
      uniqueCLOs: rows.length,
    },
    results: rows.map((row) => ({
      courseId: row.course_id,
      subjectCode: row.subject_code,
      subjectNameTh: row.subject_name_th,
      academicYear: row.academic_year,
      semester: row.semester,
      cloId: row.clo_id,
      cloNameTh: row.clo_name_th,
      cloMetadata: row.clo_metadata,
      similarity: row.similarity,
    })),
  };
}

function buildPayloadWithoutMetadata(rows: VectorSearchRow[]) {
  return rows.map((row) => ({
    courseId: row.course_id,
    subjectCode: row.subject_code,
    subjectNameTh: row.subject_name_th,
    academicYear: row.academic_year,
    semester: row.semester,
    cloId: row.clo_id,
    cloNameTh: row.clo_name_th,
    similarity: row.similarity,
  }));
}

async function main() {
  // const queryText =
  //   'Assess the specifications of a software product or system to be developed by identifying functional and non-functional requirements, constraints and possible sets of use cases which illustrate interactions between the software and its users.';
  // const queryText = 'Can speak German at a professional level';

  const skillName = 'Animal Nutrition';
  const skillDescription =
    'Understand and apply principles of animal nutrition, including formulation, feed quality control, and industrial-level dietary optimization.';

  // const skillName = 'use software design patterns';
  // const skillDescription =
  //   'Utilise reusable solutions, formalised best practices, to solve common ICT development tasks in software development and design.'.toLowerCase();

  const queryText = `Find course learning outcomes related to the skill "${skillName}", which involves ${skillDescription}`;

  const data = await SemanticsApiClient.embed({
    text: queryText,
    role: 'query',
  });

  if (!data.embeddings?.length) {
    throw new Error('Embedding API returned empty result.');
  }

  console.log('Embedding length:', data.embeddings.length);

  const embeddingVector = `[${data.embeddings.join(',')}]`;

  const result = await prisma.$queryRaw<VectorSearchRow[]>`
    WITH ranked_clos AS (
      SELECT
        c.id AS course_id,
        c.subject_code,
        c.subject_name_th,
        c.academic_year,
        c.semester,
        clo.id AS clo_id,
        clo.clo_name_th,
        clo.metadata AS clo_metadata,
        1 - (clo.embedding <=> ${embeddingVector}::vector) AS raw_similarity,
        ROW_NUMBER() OVER (
          PARTITION BY c.id
          ORDER BY (clo.embedding <=> ${embeddingVector}::vector) ASC
        ) AS rn
      FROM course_learning_outcomes AS clo
      JOIN courses AS c ON c.id = clo.course_id
    ),
    filtered_clos AS (
      SELECT *
      FROM ranked_clos
      WHERE rn <= 3
    ),
    deduped AS (
      SELECT
        filtered_clos.*,
        ROW_NUMBER() OVER (
          PARTITION BY clo_name_th
          ORDER BY raw_similarity DESC
        ) AS name_rank
      FROM filtered_clos
    )
    SELECT
      course_id,
      subject_code,
      subject_name_th,
      academic_year,
      semester,
      clo_id,
      clo_name_th,
      clo_metadata,
      ROUND(raw_similarity::numeric, 4) AS similarity
    FROM deduped
    WHERE name_rank = 1
    ORDER BY similarity DESC
    LIMIT 50;
  `;

  console.log('🎯 Top CLO matches (deduplicated by CLO name):');
  result.forEach((row, index) => {
    console.log(
      `${index + 1}. ${row.clo_name_th} — ${row.subject_name_th} [${row.subject_code}] (AY ${row.academic_year} S${row.semester}) sim=${row.similarity.toFixed(
        4,
      )}`,
    );
  });
  console.log(`\nTotal unique CLOs returned: ${result.length}`);

  const payloadWithMetadata = buildPayloadWithMetadata(result, queryText, {
    model: data.model,
    dimension: data.dimension,
    embedded_at: data.embedded_at,
  });
  const payloadWithoutMetadata = buildPayloadWithoutMetadata(result);

  const filePath = path.resolve(
    process.cwd(),
    'data/query-results-with-metadata.json',
  );
  const outputPath = await FileHelper.ensureUniqueFilePath(filePath);

  await FileHelper.writeJsonFile(outputPath, payloadWithMetadata);
  const filePath2 = path.resolve(
    process.cwd(),
    'data/query-results-without-metadata.json',
  );
  const outputPath2 = await FileHelper.ensureUniqueFilePath(filePath2);
  await FileHelper.writeJsonFile(outputPath2, payloadWithoutMetadata);

  console.log(`\n📝 Saved results to ${outputPath}`);
}

main().catch((error) => {
  console.error('💥 Error:', error);
});

// Example how to run this file:
// bunx ts-node --require tsconfig-paths/register src/playground.ts
