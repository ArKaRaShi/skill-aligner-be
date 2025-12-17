import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  const academicYear = 2568;
  const semester = 2;

  const courses = await prisma.course.findMany({
    where: {
      academicYear,
      semester,
    },
  });

  console.log(
    `Found ${courses.length} courses for semester ${semester} of academic year ${academicYear}`,
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('💥 Failed to run playground:', e);
  process.exit(1);
});

// bunx ts-node --require tsconfig-paths/register src/playground4.ts
