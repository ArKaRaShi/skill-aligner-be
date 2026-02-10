import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  const queryLogIds = [
    '27553284-019f-4c31-8dbe-b1bfbb5cb4d5',
    'a7728000-0818-42b5-a49f-c89f4ee59ab5',
    'a5b1ad24-9995-4257-a50d-0d8e7931fbbf',
    'cd96176f-8e18-4270-9c76-8c6b1cf19594',
    'b41c15f8-2249-4469-9981-71cc1c75b2b4',
    'dd9ce8ba-20e8-4d4d-b92b-574da63f242b',
    'd70fb21b-c337-425b-8b11-3ee2018f3fc4',
    '4ec5b89c-e5c8-46dd-b9cb-628c749cead6',
    '01c601d2-5583-4413-a5c6-5f463efd897c',
    'bb7d4d89-d4e7-4bb1-b04e-ddd694ba3370',
    'be573eca-6596-418a-888d-f4f0c0d5651d',
    '1fe15613-3060-4d9e-94dc-bd9a63e9911f',
    '5c5fb47c-66ad-4a6d-9ff3-4a082f4de746',
    'fd7678cc-6adb-4868-95e7-4ac339ea04c3',
    '909fa76b-d7a7-41a2-bb83-f67f1eb7c9da',
    '654330a8-2559-4273-abb4-36db7f0b31e1',
    'a945dd26-d7d4-49a4-ab23-57f3f954c8a0',
    '97b42158-60af-46d3-aa60-049d1243d2ee',
    '1e7e132d-31b7-49fe-91dc-c2e0358a1b24',
    '3ef3d308-ac42-453e-bce7-bb7376046c41',
    '00e399aa-cf3c-472b-b5be-9a6e86e10637',
    'b3460fa2-c348-4748-b583-4b042886e0ca',
    'acd5b76f-8185-4b10-bb37-bde0ac14c51a',
    'adc6cdc0-e0f6-4006-849b-1d06dff5368c',
    '75dd76dc-b23f-4728-b9a4-09621f52a26b',
    'fa617f52-c86b-4b8c-976b-bfdb073f1070',
  ];

  const questionLogs = await prisma.questionLog.findMany({
    where: {
      relatedProcessLogId: { in: queryLogIds },
    },
  });

  console.log(
    `Found ${questionLogs.length} question logs related to the given query logs.`,
  );
  console.log('Question Log IDs:');
  console.log(questionLogs.map((log) => log.id).join(','));
}

main().catch((e) => {
  console.error('💥 Failed to run playground:', e);
  process.exit(1);
});

// bunx ts-node --require tsconfig-paths/register src/playground3.ts
