import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  const courses = await prisma.course.findMany();

  const uniqueNamePerCode = new Map<string, string>();
  for (const course of courses) {
    const existingName = uniqueNamePerCode.get(course.subjectCode);
    if (!existingName) {
      uniqueNamePerCode.set(course.subjectCode, course.subjectName);
    } else if (existingName !== course.subjectName) {
      console.log(
        `Conflict for code ${course.subjectCode}: "${existingName}" vs "${course.subjectName}"`,
      );
    }
  }
  console.log(`Found ${courses.length} courses in total.`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('💥 Failed to run playground:', e);
  process.exit(1);
});

// bunx ts-node --require tsconfig-paths/register src/playground5.ts
