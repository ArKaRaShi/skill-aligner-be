import path from 'path';

import { SemanticsClient } from 'src/common/adapters/secondary';
import {
  SEMANTIC_EMBEDDED_AT,
  SEMANTIC_EMBEDDING_DIMENSION,
  SEMANTIC_EMBEDDING_MODEL,
} from 'src/common/adapters/secondary/semantics/semantics.dto';
import { CloEmbeddingMetadata } from 'src/common/domain/types/clo-embedding-metadata';
import { FileHelper } from 'src/common/helpers/file';

import {
  Course,
  EmbeddedCourse,
  EmbeddedCoursesSnapshot,
  loadCourses,
} from 'src/modules/course/adapters/secondary/file/course-data.loader';

const semanticsClient = new SemanticsClient();

type ExportMode = 'plain' | 'embedded';

const EMBEDDING_NOTE = 'initial embedding for CLO ingestion';

function createEmbeddingMetadata(dimension: number): CloEmbeddingMetadata {
  return {
    model: SEMANTIC_EMBEDDING_MODEL,
    dimension,
    embeddedAt: SEMANTIC_EMBEDDED_AT,
    by: 'manual run of prisma/seeds/course.export.ts',
    note: EMBEDDING_NOTE,
  };
}

async function attachEmbeddings(
  courses: Course[],
): Promise<EmbeddedCoursesSnapshot> {
  const result: EmbeddedCourse[] = [];
  let metadata: CloEmbeddingMetadata | null = null;

  for (const course of courses) {
    const data = await semanticsClient.batchEmbed({
      items: course.courseLearningOutcomes.map((clo) => ({
        text: `${course.subjectNameTh}: ${clo.cloNameTh}`,
        role: 'passage',
      })),
    });
    if (!data.items?.length) {
      throw new Error(
        `Embedding API returned empty embeddings for ${course.subjectCode} (${course.academicYear} S${course.semester})`,
      );
    }

    if (!metadata) {
      const dimension = data.items[0]?.embedding.length ?? data.dimension ?? 0;
      if (!dimension) {
        throw new Error(
          'Unable to determine embedding dimension from API response.',
        );
      }
      metadata = {
        model: data.model ?? SEMANTIC_EMBEDDING_MODEL,
        dimension,
        embeddedAt: data.embedded_at ?? SEMANTIC_EMBEDDED_AT,
        by: 'manual run of prisma/seeds/course.export.ts',
        note: EMBEDDING_NOTE,
      };
    }

    const withEmbeddings = course.courseLearningOutcomes.map((clo, idx) => {
      const item = data.items[idx];
      if (!item) {
        throw new Error(
          `Invariant failed: missing embedding for course ${course.subjectCode} CLO ${clo.cloId}`,
        );
      }
      return {
        ...clo,
        embedding: item.embedding,
        embeddingMetadata: {
          ...metadata!,
          originalText: item.original_text,
          adjustedText: item.adjusted_text,
        },
      };
    });

    result.push({
      ...course,
      courseLearningOutcomes: withEmbeddings,
    });
    console.log(
      `✅ Embedded course ${course.subjectCode} (${course.academicYear} S${course.semester})`,
    );
  }

  if (!metadata) {
    metadata = createEmbeddingMetadata(SEMANTIC_EMBEDDING_DIMENSION);
  }

  return {
    metadata,
    courses: result,
  };
}

function resolveModes(): ExportMode[] {
  const args = new Set(process.argv.slice(2));
  const hasFlags = Array.from(args).some((arg) =>
    ['--plain', '--embedded'].includes(arg),
  );

  if (!hasFlags) return ['plain', 'embedded'];

  const modes: ExportMode[] = [];
  if (args.has('--plain')) modes.push('plain');
  if (args.has('--embedded')) modes.push('embedded');
  if (modes.length === 0) {
    throw new Error('Unknown CLI flags. Use --plain and/or --embedded.');
  }
  return modes;
}

async function main() {
  const modes = resolveModes();
  const courses = await loadCourses();

  console.log(`📄 Loaded ${courses.length} courses from CSV/JSON files`);

  if (modes.includes('plain')) {
    const filePath = path.resolve(
      process.cwd(),
      'data/e5.base.courses.combined.json',
    );
    const outputPath = await FileHelper.ensureUniqueFilePath(filePath);

    await FileHelper.writeJsonFile(outputPath, { courses });
  }

  if (modes.includes('embedded')) {
    const embeddedPayload = await attachEmbeddings(courses);
    const filePath = path.resolve(
      process.cwd(),
      'data/e5.base.courses.combined.embedded.json',
    );
    const embeddedPath = await FileHelper.ensureUniqueFilePath(filePath);
    await FileHelper.writeJsonFile(embeddedPath, embeddedPayload);
  }
}

main().catch((e) => {
  console.error('💥 Failed to export courses to JSON:', e);
  process.exit(1);
});

// Example of how to run this:
// bunx ts-node --require tsconfig-paths/register prisma/seeds/course.export.ts --embedded
