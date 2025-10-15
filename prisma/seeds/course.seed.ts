import { PrismaClient } from '@prisma/client';

import {
  CourseFileLoader,
  EmbeddedCourse,
} from 'src/modules/course/adapters/secondary/file/course-data.loader';

const prisma = new PrismaClient();
const DEV_LIMIT = Number(process.env.SEED_COURSE_LIMIT ?? '10000');

async function seedCourse(course: EmbeddedCourse) {
  await prisma.$transaction(async (tx) => {
    const updatedCourse = await tx.course.upsert({
      where: {
        unique_course: {
          campusCode: course.campusCode,
          facultyCode: course.facultyCode,
          academicYear: course.academicYear,
          subjectCode: course.subjectCode,
          semester: course.semester,
        },
      },
      create: {
        id: course.courseId,
        academicYear: course.academicYear,
        semester: course.semester,
        campusCode: course.campusCode,
        facultyCode: course.facultyCode,
        subjectCode: course.subjectCode,
        subjectNameTh: course.subjectNameTh,
      },
      update: {
        semester: course.semester,
        subjectNameTh: course.subjectNameTh,
      },
    });

    await tx.courseLearningOutcome.deleteMany({
      where: { courseId: updatedCourse.id },
    });

    for (const clo of course.courseLearningOutcomes) {
      if (!clo.embedding?.length) {
        throw new Error(
          `Invariant failed: missing embedding vector for CLO ${clo.cloId}`,
        );
      }

      const embeddingVector = `[${clo.embedding.join(',')}]`;
      const metadataJson = JSON.stringify(clo.embeddingMetadata);

      await tx.$executeRaw`
INSERT INTO course_learning_outcomes
  (id, clo_no, clo_name_th, course_id, embedding, metadata, created_at, updated_at)
VALUES
  (${clo.cloId}::uuid, ${clo.cloNo}, ${clo.cloNameTh}, ${updatedCourse.id}::uuid, ${embeddingVector}::vector, ${metadataJson}::jsonb, NOW(), NOW())
`;
    }
  });
}

async function main() {
  const snapshot = await CourseFileLoader.loadEmbeddedSnapshot(
    'data/e5.base.courses.combined.embedded-2.json',
  );
  const courses =
    DEV_LIMIT > 0 ? snapshot.courses.slice(0, DEV_LIMIT) : snapshot.courses;

  console.log(
    `🧠 Using precomputed embeddings: model=${snapshot.metadata.model}, dimension=${snapshot.metadata.dimension}, embeddedAt=${snapshot.metadata.embeddedAt}`,
  );

  const previewCourse = courses.slice(0, 5).map((course) => ({
    subjectCode: course.subjectCode,
    year: course.academicYear,
    campus: course.campusCode,
    faculty: course.facultyCode,
    semester: course.semester,
    cloCount: course.courseLearningOutcomes.length,
  }));
  const previewClo = courses[0].courseLearningOutcomes[0];
  console.log(
    '📊 First 5 course summaries:',
    JSON.stringify(previewCourse, null, 2),
  );
  console.log(
    '🔍 Sample CLO embedding:',
    JSON.stringify(
      {
        cloId: previewClo.cloId,
        cloNameTh: previewClo.cloNameTh,
        cloNo: previewClo.cloNo,
        embeddingDimension: previewClo.embedding?.length ?? 0,
        embeddingSample: previewClo.embedding?.slice(0, 5) ?? [],
        embeddingMetadata: previewClo.embeddingMetadata,
      },
      null,
      2,
    ),
  );

  console.log(`⚙️  Seeding ${courses.length} courses (limit=${DEV_LIMIT})`);

  try {
    for (const course of courses) {
      console.log(
        `⏳ Seeding course: ${course.subjectCode} (${course.academicYear} S${course.semester}) with ${course.courseLearningOutcomes.length} CLOs`,
      );
      await seedCourse(course);
      console.log(
        `✅ Seeded course: ${course.subjectCode} (${course.academicYear} S${course.semester}) with ${course.courseLearningOutcomes.length} CLOs`,
      );
    }
    console.log('🎉 Seed completed successfully.');
  } catch (error) {
    console.error('💥 Seed failed during DB operation:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('💥 Seed failed:', error);
  process.exit(1);
});
