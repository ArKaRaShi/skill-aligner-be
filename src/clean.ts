import { PrismaClient } from '@prisma/client';

/**
 * Database cleanup script - Deletes all logs from the database.
 *
 * ⚠️  DANGER: This will DELETE ALL DATA from question logs and query process logs tables!
 *
 * Usage:
 *   bunx ts-node --require tsconfig-paths/register src/clean.ts
 *
 * IMPORTANT: This script is protected and will NOT run automatically.
 * You must explicitly call main() to execute the cleanup.
 */
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

// Only run if this file is executed directly (not imported)
// This prevents accidental execution during test compilation
if (require.main === module) {
  main().catch((e) => {
    console.error('💥 Failed to clean logs:', e);
    process.exit(1);
  });
}

export { main };
