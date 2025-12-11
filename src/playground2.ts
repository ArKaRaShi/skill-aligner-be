// check for potential diffrent courses link to same learning outcome
// check potential same course name but different subject code
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const courses = await prisma.course.findMany({
    select: {
      id: true,
      subjectCode: true,
      subjectNameEn: true,
      subjectNameTh: true,
    },
  });

  const nameToCourseCodesMap: Record<string, Set<string>> = {};

  for (const course of courses) {
    const nameKey = `${course.subjectNameTh || ''}||${course.subjectNameEn || ''}`;
    if (!nameToCourseCodesMap[nameKey]) {
      nameToCourseCodesMap[nameKey] = new Set();
    }
    nameToCourseCodesMap[nameKey].add(course.subjectCode);
  }

  for (const [nameKey, subjectCodes] of Object.entries(nameToCourseCodesMap)) {
    if (subjectCodes.size > 1) {
      const [subjectNameTh, subjectNameEn] = nameKey.split('||');
      console.log(
        `Course Name Th: "${subjectNameTh}", En: "${subjectNameEn}" is linked to multiple subject codes: ${Array.from(subjectCodes).join(', ')}`,
      );
    }
  }

  const learningOutcomes = await prisma.courseLearningOutcome.findMany({
    include: { linkedCourses: { include: { course: true } } },
  });
  const learningOutcomesToSubjectCodeMap: Record<string, Set<string>> = {};

  for (const lo of learningOutcomes) {
    for (const linkedCourse of lo.linkedCourses) {
      const subjectCode = linkedCourse.course.subjectCode;
      if (!learningOutcomesToSubjectCodeMap[lo.cleanedCLONameTh]) {
        learningOutcomesToSubjectCodeMap[lo.cleanedCLONameTh] = new Set();
      }
      learningOutcomesToSubjectCodeMap[lo.cleanedCLONameTh].add(subjectCode);
    }
  }

  let sameLinkCount = 0;
  for (const [loName, subjectCodes] of Object.entries(
    learningOutcomesToSubjectCodeMap,
  )) {
    if (subjectCodes.size > 1) {
      console.log(
        `Learning Outcome: "${loName}" is linked to multiple subject codes: ${Array.from(subjectCodes).join(', ')}`,
      );
      sameLinkCount++;
    }
  }
  console.log(
    `Total learning outcomes linked to multiple subject codes: ${sameLinkCount}`,
  );
}

main().catch((e) => {
  console.error('💥 Failed to run playground:', e);
  process.exit(1);
});

// bunx ts-node --require tsconfig-paths/register src/playground2.ts
