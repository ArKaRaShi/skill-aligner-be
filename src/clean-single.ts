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
          in: ['4fbaf337-ebe3-464b-90f0-c1c1ef58a0d1'],
        },
      },
    });
    console.log(`Deleted ${deletedQueryProcessLogs.count} query process logs.`);
    const deletedQuestionLogs = await prisma.questionLog.deleteMany({
      where: {
        id: {
          in: ['287b5b2c-a538-484b-8fca-758de0612571'],
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
