import { FileHelper } from './common/helpers/file';
import { PayloadWithMetadata } from './playground';

async function main() {
  const SLICE_SIZE = 32;

  const data1 = await FileHelper.readJsonFile<PayloadWithMetadata>(
    'data/query-results-with-metadata-1.json',
  );
  const data2 = await FileHelper.readJsonFile<PayloadWithMetadata>(
    'data/query-results-with-metadata-2.json',
  );

  const sliceData1 = data1.results.slice(0, SLICE_SIZE);
  const sliceData2 = data2.results.slice(0, SLICE_SIZE);

  console.log(`Comparing top ${SLICE_SIZE} items from two datasets:`);

  if (sliceData1.length !== sliceData2.length) {
    console.warn(
      `Warning: The two datasets have different lengths (${sliceData1.length} vs ${sliceData2.length})`,
    );
  }

  console.log(`Query: ${data1.metadata.queryText}`);
  for (let i = 0; i < SLICE_SIZE; i++) {
    const item1 = sliceData1[i];
    const item2 = sliceData2[i];

    // omit id, subject code, only clo_name_th and similarity, course name, separated line
    console.log(
      `Number ${i + 1}:\n` +
        `1. ${item1.subjectNameTh} - ${item1.cloNameTh} (sim=${item1.similarity})\n` +
        `2. ${item2.subjectNameTh} - ${item2.cloNameTh} (sim=${item2.similarity})\n`,
    );
  }
}

main().catch((e) => {
  console.error('💥 Failed to run playground:', e);
  process.exit(1);
});
