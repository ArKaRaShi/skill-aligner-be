import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type EmbeddingResponse = {
  embeddings: number[];
};

async function main() {
  const queryText =
    'สื่อสารภาษาอังกฤษได้อย่างมีประสิทธิภาพทั้งการพูดและการเขียน';

  // 1️⃣ Get embedding from API
  const res = await fetch('http://localhost:8000/api/v1/semantics/embed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: queryText, role: 'query' }),
  });

  if (!res.ok) throw new Error(`Embedding API failed: ${res.status}`);
  const data = (await res.json()) as EmbeddingResponse;
  const embedding = `[${data.embeddings.join(',')}]`; // vector literal

  console.log('Embedding length:', data.embeddings.length);

  // 2️⃣ Query — find each course’s single best matching CLO
  const result = await prisma.$queryRawUnsafe<
    {
      course_id: string;
      subject_name_th: string;
      clo_id: string;
      clo_name_th: string;
      similarity: number;
    }[]
  >(`
    SELECT DISTINCT ON (c.id)
      c.id AS course_id,
      c.subject_name_th,
      clo.id AS clo_id,
      clo.clo_name_th,
      ROUND(1 - (clo.embedding <-> ${embedding}), 4) AS similarity
    FROM course_learning_outcomes AS clo
    JOIN courses AS c ON c.id = clo.course_id
    ORDER BY c.id, (clo.embedding <-> ${embedding}) ASC
    LIMIT 20;
  `);

  console.log('🎯 Top matching CLO per course:');
  for (const r of result) {
    console.log(
      `📘 ${r.subject_name_th}\n   • ${r.clo_name_th} (sim=${r.similarity})`,
    );
  }
}

main().catch((e) => {
  console.error('💥 Error:', e);
});
