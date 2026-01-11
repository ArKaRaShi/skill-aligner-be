import { PrismaClient } from '@prisma/client';

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

main().catch((e) => {
  console.error('💥 Failed to clean logs:', e);
  process.exit(1);
});

// bunx ts-node --require tsconfig-paths/register src/clean-single.ts
