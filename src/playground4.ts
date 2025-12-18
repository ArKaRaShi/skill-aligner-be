import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  const totalClos = await prisma.courseLearningOutcome.count();
  console.log(`Total CLOs: ${totalClos}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('💥 Failed to run playground:', e);
  process.exit(1);
});

// bunx ts-node --require tsconfig-paths/register src/playground4.ts
