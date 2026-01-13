import { PrismaClient } from '@prisma/client';

/**
 * Delete specific log entries by ID.
 *
 * ⚠️  DANGER: This will DELETE data from the database!
 *
 * Usage:
 *   bunx ts-node --require tsconfig-paths/register src/clean-single.ts
 *
 * IMPORTANT: This script is protected and will NOT run automatically.
 * You must explicitly call main() to execute the cleanup.
 */
async function main() {
  const prisma = new PrismaClient();
  try {
    const deletedQueryProcessLogs = await prisma.queryProcessLog.deleteMany({
      where: {
        id: {
          notIn: ['fdb7e094-0f73-4c7f-9a8d-c5d3844b9c87'],
        },
      },
    });
    console.log(`Deleted ${deletedQueryProcessLogs.count} query process logs.`);
    const deletedQuestionLogs = await prisma.questionLog.deleteMany({
      where: {
        id: {
          notIn: ['f23b18d6-cc6c-4da1-bf66-11564272847d'],
        },
      },
    });
    console.log(`Deleted ${deletedQuestionLogs.count} question logs.`);
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

// bunx ts-node --require tsconfig-paths/register src/clean-single.ts
