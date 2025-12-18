import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  const courses = await prisma.course.findMany({
    include: {
      courseOfferings: {
        include: {
          courseLearningOutcomes: true,
        },
      },
    },
  });

  for (const course of courses) {
    const loNamesSet = new Set<string>();
    const loNamesList: string[] = [];
    for (const offering of course.courseOfferings) {
      for (const lo of offering.courseLearningOutcomes) {
        loNamesSet.add(lo.cleanedCloName);
        loNamesList.push(lo.cleanedCloName);
      }
    }
    // console.log(
    //   `Course ${course.subjectCode} has ${loNamesSet.size} unique CLOs out of ${loNamesList.length} total CLOs.`,
    // );

    if (!Number.isInteger(loNamesList.length / course.courseOfferings.length)) {
      console.log(
        `  -> Warning: The number of CLOs per offering is not consistent!`,
      );
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('💥 Failed to run playground:', e);
  process.exit(1);
});

// bunx ts-node --require tsconfig-paths/register src/playground7.ts
