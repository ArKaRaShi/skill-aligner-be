import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const deletedLogs = await prisma.questionLog.deleteMany({});
    console.log(`Deleted ${deletedLogs.count} question logs`);
    const deletedQueryProcessLogs = await prisma.queryProcessLog.deleteMany({});
    console.log(`Deleted ${deletedQueryProcessLogs.count} query process logs.`);
    // const deletedVectors =
    //   await prisma.courseLearningOutcomeVector.deleteMany();
    // console.log(
    //   `Deleted ${deletedVectors.count} course learning outcome vectors.`,
    // );
  } catch (error) {
    console.error('Error during log cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('💥 Failed to clean logs:', e);
  process.exit(1);
});

// bunx ts-node --require tsconfig-paths/register src/clean.ts
