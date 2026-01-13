import { PrismaClient } from '@prisma/client';

import { STEP_NAME } from './modules/query-logging/types/query-status.type';

async function main() {
  const prisma = new PrismaClient();
  try {
    const steps5Logs = await prisma.queryProcessStep.findMany({
      where: {
        stepName: STEP_NAME.COURSE_RELEVANCE_FILTER,
      },
    });
    console.log(
      `Found ${steps5Logs.length} steps with COURSE_RELEVANCE_FILTER step name.`,
    );
    console.log(`Inspect index 0:`, steps5Logs[0].output);
  } catch (error) {
    console.error('Error during playground execution:', error);
  }
}

main().catch((e) => {
  console.error('💥 Failed to run playground:', e);
  process.exit(1);
});

// bunx ts-node --require tsconfig-paths/register src/inspect-log.ts
