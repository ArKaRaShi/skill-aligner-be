import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  const courseLearningOutcomes = await prisma.courseLearningOutcome.findMany();

  // is cleanedCloName duplicate?
  const cloNameMap = new Map<string, string[]>();

  for (const clo of courseLearningOutcomes) {
    const existing = cloNameMap.get(clo.cleanedCloName);
    if (!existing) {
      cloNameMap.set(clo.cleanedCloName, [clo.id]);
    } else {
      existing.push(clo.id);
    }
  }
  console.log('CLOs with duplicate cleanedCloName:');
  for (const [cloName, ids] of cloNameMap.entries()) {
    if (ids.length > 1) {
      console.log(`CLO Name: "${cloName}" has IDs: ${ids.join(', ')}`);
    }
  }

  // is originalCLONameTh duplicate?
  const originalCloNameMap = new Map<string, string[]>();

  for (const clo of courseLearningOutcomes) {
    const existing = originalCloNameMap.get(clo.originalCloName);
    if (!existing) {
      originalCloNameMap.set(clo.originalCloName, [clo.id]);
    } else {
      existing.push(clo.id);
    }
  }
  console.log('CLOs with duplicate originalCloName:');
  for (const [cloName, ids] of originalCloNameMap.entries()) {
    if (ids.length > 1) {
      console.log(`CLO Name: "${cloName}" has IDs: ${ids.join(', ')}`);
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('💥 Failed to run playground:', e);
  process.exit(1);
});

// bunx ts-node --require tsconfig-paths/register src/playground6.ts
