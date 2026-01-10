import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const deletedQueryProcessLogs = await prisma.queryProcessLog.deleteMany({
      where: { id: { in: ['db571cea-2ee8-4976-9976-ec64e58f7e97'] } },
    });
    console.log(`Deleted ${deletedQueryProcessLogs.count} query process logs.`);
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
