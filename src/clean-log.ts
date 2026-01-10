import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const deletedLogs = await prisma.questionLog.deleteMany({});
    console.log(
      `Deleted ${deletedLogs.count} question logs with null questions.`,
    );
    const deletedAnalyses = await prisma.questionLogAnalysis.deleteMany({});
    console.log(
      `Deleted ${deletedAnalyses.count} question log analyses with null analyses.`,
    );
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

// bunx ts-node --require tsconfig-paths/register src/clean-log.ts
