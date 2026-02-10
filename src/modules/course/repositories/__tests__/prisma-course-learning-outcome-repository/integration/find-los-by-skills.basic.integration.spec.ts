import {
  buildVectorFromSequence,
  FindLosBySkillsTestFixture,
  insertCourseLearningOutcomeRecord,
  MOCK_CLO1_ID,
  MOCK_CLO2_ID,
  MOCK_CLO3_ID,
  MOCK_CLO4_ID,
  MOCK_CLO5_ID,
  MOCK_CLO6_ID,
  MOCK_CLO7_ID,
  MOCK_CLO8_ID,
  VECTOR_DIMENSION_768,
  VECTOR_DIMENSION_1536,
} from '../fixtures/find-los-by-skills.fixture';

describe('PrismaCourseLearningOutcomeRepository - Basic Filters (Integration)', () => {
  let fixture: FindLosBySkillsTestFixture;

  beforeAll(async () => {
    fixture = new FindLosBySkillsTestFixture();
    await fixture.setup();
  });

  beforeEach(async () => {
    await fixture.beforeEach();
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  describe('findLosBySkills with filters', () => {
    it('should find learning outcomes without filters', async () => {
      const { losBySkill: result } = await fixture.repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
      });

      expect(result.size).toBe(1);
      expect(result.has('วิเคราะห์')).toBe(true);
      const matches = result.get('วิเคราะห์')!;
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some((match) => match.loId === MOCK_CLO7_ID)).toBeTruthy();
      expect(new Set(matches.map((clo) => clo.loId)).size).toBe(matches.length);
    });

    it('should filter by campusId (first campus)', async () => {
      const { losBySkill: result } = await fixture.repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        campusId: fixture.campus1Id,
      });

      expect(result.size).toBe(1);
      expect(result.has('วิเคราะห์')).toBe(true);
      const cloIds = result.get('วิเคราะห์')!.map((clo) => clo.loId);
      expect(cloIds.length).toBeGreaterThan(0);
      const allowedIds = new Set([
        MOCK_CLO1_ID,
        MOCK_CLO2_ID,
        MOCK_CLO3_ID,
        MOCK_CLO7_ID,
        MOCK_CLO8_ID,
      ]);
      cloIds.forEach((id) => {
        expect(allowedIds.has(id)).toBeTruthy();
      });
    });

    it('should filter by campusId (second campus)', async () => {
      const { losBySkill: result } = await fixture.repository.findLosBySkills({
        skills: ['วางแผน'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        campusId: fixture.campus2Id,
      });

      expect(result.size).toBe(1);
      expect(result.has('วางแผน')).toBe(true);
      const cloIds = result.get('วางแผน')!.map((clo) => clo.loId);
      expect(cloIds.length).toBeGreaterThan(0);
      const allowedIds = new Set([MOCK_CLO4_ID, MOCK_CLO5_ID, MOCK_CLO6_ID]);
      cloIds.forEach((id) => {
        expect(allowedIds.has(id)).toBeTruthy();
      });
    });

    it('should filter by facultyId (first faculty)', async () => {
      const { losBySkill: result } = await fixture.repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        facultyId: fixture.faculty1Id,
      });

      expect(result.size).toBe(1);
      expect(result.has('วิเคราะห์')).toBe(true);
      const cloIds = result.get('วิเคราะห์')!.map((clo) => clo.loId);
      expect(cloIds.length).toBeGreaterThan(0);
      const allowedIds = new Set([
        MOCK_CLO1_ID,
        MOCK_CLO2_ID,
        MOCK_CLO3_ID,
        MOCK_CLO7_ID,
        MOCK_CLO8_ID,
      ]);
      cloIds.forEach((id) => {
        expect(allowedIds.has(id)).toBeTruthy();
      });
    });

    it('should filter by facultyId (second faculty)', async () => {
      const { losBySkill: result } = await fixture.repository.findLosBySkills({
        skills: ['จัดการทีม'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        facultyId: fixture.faculty2Id,
      });

      expect(result.size).toBe(1);
      expect(result.has('จัดการทีม')).toBe(true);
      const cloIds = result.get('จัดการทีม')!.map((clo) => clo.loId);
      expect(cloIds.length).toBeGreaterThan(0);
      const allowedIds = new Set([MOCK_CLO4_ID, MOCK_CLO5_ID, MOCK_CLO6_ID]);
      cloIds.forEach((id) => {
        expect(allowedIds.has(id)).toBeTruthy();
      });
    });

    it('should filter by isGenEd = true', async () => {
      const { losBySkill: result } = await fixture.repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        isGenEd: true,
      });

      expect(result.size).toBe(1);
      expect(result.has('วิเคราะห์')).toBe(true);
      expect(result.get('วิเคราะห์')).toHaveLength(6);

      const cloIds = result.get('วิเคราะห์')!.map((clo) => clo.loId);
      expect(cloIds).toContain(MOCK_CLO1_ID);
      expect(cloIds).toContain(MOCK_CLO2_ID);
      expect(cloIds).toContain(MOCK_CLO4_ID);
      expect(cloIds).toContain(MOCK_CLO5_ID);
      expect(cloIds).toContain(MOCK_CLO7_ID);
      expect(cloIds).toContain(MOCK_CLO8_ID);
      expect(cloIds).not.toContain(MOCK_CLO3_ID);
      expect(cloIds).not.toContain(MOCK_CLO6_ID);
    });

    it('should filter by isGenEd = false', async () => {
      const { losBySkill: result } = await fixture.repository.findLosBySkills({
        skills: ['สื่อสาร'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        isGenEd: false,
      });

      expect(result.size).toBe(1);
      expect(result.has('สื่อสาร')).toBe(true);
      expect(result.get('สื่อสาร')).toHaveLength(2);

      const cloIds = result.get('สื่อสาร')!.map((clo) => clo.loId);
      expect(cloIds).toContain(MOCK_CLO3_ID);
      expect(cloIds).toContain(MOCK_CLO6_ID);
      expect(cloIds).not.toContain(MOCK_CLO1_ID);
      expect(cloIds).not.toContain(MOCK_CLO2_ID);
      expect(cloIds).not.toContain(MOCK_CLO4_ID);
      expect(cloIds).not.toContain(MOCK_CLO5_ID);
      expect(cloIds).not.toContain(MOCK_CLO7_ID);
      expect(cloIds).not.toContain(MOCK_CLO8_ID);
    });

    it('should filter by multiple criteria (first campus)', async () => {
      const { losBySkill: result } = await fixture.repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        campusId: fixture.campus1Id,
        facultyId: fixture.faculty1Id,
        isGenEd: true,
      });

      expect(result.size).toBe(1);
      expect(result.has('วิเคราะห์')).toBe(true);
      expect(result.get('วิเคราะห์')).toHaveLength(4);

      const cloIds = result.get('วิเคราะห์')!.map((clo) => clo.loId);
      expect(cloIds).toContain(MOCK_CLO1_ID);
      expect(cloIds).toContain(MOCK_CLO2_ID);
      expect(cloIds).toContain(MOCK_CLO7_ID);
      expect(cloIds).toContain(MOCK_CLO8_ID);
      expect(cloIds).not.toContain(MOCK_CLO3_ID);
      expect(cloIds).not.toContain(MOCK_CLO4_ID);
      expect(cloIds).not.toContain(MOCK_CLO5_ID);
      expect(cloIds).not.toContain(MOCK_CLO6_ID);
    });

    it('should filter by multiple criteria (second campus)', async () => {
      const { losBySkill: result } = await fixture.repository.findLosBySkills({
        skills: ['วางแผน'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        campusId: fixture.campus2Id,
        facultyId: fixture.faculty2Id,
        isGenEd: true,
      });

      expect(result.size).toBe(1);
      expect(result.has('วางแผน')).toBe(true);
      expect(result.get('วางแผน')).toHaveLength(2);

      const cloIds = result.get('วางแผน')!.map((clo) => clo.loId);
      expect(cloIds).toContain(MOCK_CLO4_ID);
      expect(cloIds).toContain(MOCK_CLO5_ID);
      expect(cloIds).not.toContain(MOCK_CLO6_ID);
      expect(cloIds).not.toContain(MOCK_CLO1_ID);
      expect(cloIds).not.toContain(MOCK_CLO2_ID);
      expect(cloIds).not.toContain(MOCK_CLO3_ID);
    });

    it('should return filtered results when isGenEd filter excludes some results', async () => {
      const { losBySkill: result } = await fixture.repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        isGenEd: false,
      });

      expect(result.size).toBe(1);
      expect(result.has('วิเคราะห์')).toBe(true);
      expect(result.get('วิเคราะห์')).toHaveLength(2);

      const cloIds = result.get('วิเคราะห์')!.map((clo) => clo.loId);
      expect(cloIds).toContain(MOCK_CLO3_ID);
      expect(cloIds).toContain(MOCK_CLO6_ID);
      expect(cloIds).not.toContain(MOCK_CLO1_ID);
      expect(cloIds).not.toContain(MOCK_CLO2_ID);
      expect(cloIds).not.toContain(MOCK_CLO4_ID);
      expect(cloIds).not.toContain(MOCK_CLO5_ID);
      expect(cloIds).not.toContain(MOCK_CLO7_ID);
      expect(cloIds).not.toContain(MOCK_CLO8_ID);
    });

    it('should handle multiple skills with filters', async () => {
      const { losBySkill: result } = await fixture.repository.findLosBySkills({
        skills: ['วิเคราะห์', 'สื่อสาร'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        isGenEd: true,
      });

      expect(result.size).toBe(2);
      expect(result.has('วิเคราะห์')).toBe(true);
      expect(result.has('สื่อสาร')).toBe(true);
      expect(result.get('วิเคราะห์')).toHaveLength(6);
      expect(result.get('สื่อสาร')).toHaveLength(6);

      const analysisCloIds = result.get('วิเคราะห์')!.map((clo) => clo.loId);
      const communicationCloIds = result.get('สื่อสาร')!.map((clo) => clo.loId);

      expect(analysisCloIds).toContain(MOCK_CLO1_ID);
      expect(analysisCloIds).toContain(MOCK_CLO2_ID);
      expect(analysisCloIds).toContain(MOCK_CLO4_ID);
      expect(analysisCloIds).toContain(MOCK_CLO5_ID);
      expect(analysisCloIds).toContain(MOCK_CLO7_ID);
      expect(analysisCloIds).toContain(MOCK_CLO8_ID);
      expect(analysisCloIds).not.toContain(MOCK_CLO3_ID);
      expect(analysisCloIds).not.toContain(MOCK_CLO6_ID);

      expect(communicationCloIds).toContain(MOCK_CLO1_ID);
      expect(communicationCloIds).toContain(MOCK_CLO2_ID);
      expect(communicationCloIds).toContain(MOCK_CLO4_ID);
      expect(communicationCloIds).toContain(MOCK_CLO5_ID);
      expect(communicationCloIds).toContain(MOCK_CLO7_ID);
      expect(communicationCloIds).toContain(MOCK_CLO8_ID);
      expect(communicationCloIds).not.toContain(MOCK_CLO3_ID);
      expect(communicationCloIds).not.toContain(MOCK_CLO6_ID);
    });

    it('should filter by academicYear filters', async () => {
      const { losBySkill: result } = await fixture.repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        academicYearSemesters: [{ academicYear: 2023 }],
      });

      expect(result.size).toBe(1);
      expect(result.has('วิเคราะห์')).toBe(true);
      const cloIds = result.get('วิเคราะห์')!.map((clo) => clo.loId);
      expect(cloIds.length).toBeGreaterThan(0);
      const allowedIds = new Set([
        MOCK_CLO1_ID,
        MOCK_CLO2_ID,
        MOCK_CLO3_ID,
        MOCK_CLO4_ID,
        MOCK_CLO5_ID,
        MOCK_CLO6_ID,
        MOCK_CLO7_ID,
        MOCK_CLO8_ID,
      ]);
      cloIds.forEach((id) => {
        expect(allowedIds.has(id)).toBeTruthy();
      });
    });

    it('should filter by academic year and semesters', async () => {
      const { losBySkill: result } = await fixture.repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        academicYearSemesters: [{ academicYear: 2023, semesters: [1] }],
      });

      expect(result.size).toBe(1);
      expect(result.has('วิเคราะห์')).toBe(true);
      const cloIds = result.get('วิเคราะห์')!.map((clo) => clo.loId);
      expect(cloIds.length).toBeGreaterThan(0);
      const allowedIds = new Set([
        MOCK_CLO1_ID,
        MOCK_CLO2_ID,
        MOCK_CLO3_ID,
        MOCK_CLO4_ID,
        MOCK_CLO5_ID,
        MOCK_CLO6_ID,
        MOCK_CLO7_ID,
        MOCK_CLO8_ID,
      ]);
      cloIds.forEach((id) => {
        expect(allowedIds.has(id)).toBeTruthy();
      });
    });

    it('should filter by multiple academicYear entries', async () => {
      const { losBySkill: result } = await fixture.repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        academicYearSemesters: [{ academicYear: 2023 }, { academicYear: 2024 }],
      });

      expect(result.size).toBe(1);
      expect(result.has('วิเคราะห์')).toBe(true);
      const cloIds = result.get('วิเคราะห์')!.map((clo) => clo.loId);
      expect(cloIds.length).toBeGreaterThan(0);
      const allowedIds = new Set([
        MOCK_CLO1_ID,
        MOCK_CLO2_ID,
        MOCK_CLO3_ID,
        MOCK_CLO4_ID,
        MOCK_CLO5_ID,
        MOCK_CLO6_ID,
        MOCK_CLO7_ID,
        MOCK_CLO8_ID,
      ]);
      cloIds.forEach((id) => {
        expect(allowedIds.has(id)).toBeTruthy();
      });
    });

    it('should filter by multiple semesters within a year', async () => {
      const { losBySkill: result } = await fixture.repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        academicYearSemesters: [
          {
            academicYear: 2023,
            semesters: [1, 2],
          },
        ],
      });

      expect(result.size).toBe(1);
      expect(result.has('วิเคราะห์')).toBe(true);
      const cloIds = result.get('วิเคราะห์')!.map((clo) => clo.loId);
      expect(cloIds.length).toBeGreaterThan(0);
      const allowedIds = new Set([
        MOCK_CLO1_ID,
        MOCK_CLO2_ID,
        MOCK_CLO3_ID,
        MOCK_CLO4_ID,
        MOCK_CLO5_ID,
        MOCK_CLO6_ID,
        MOCK_CLO7_ID,
        MOCK_CLO8_ID,
      ]);
      cloIds.forEach((id) => {
        expect(allowedIds.has(id)).toBeTruthy();
      });
    });

    it('should filter by mixed academic year and semester entries', async () => {
      const { losBySkill: result } = await fixture.repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        academicYearSemesters: [
          { academicYear: 2023, semesters: [1] },
          { academicYear: 2024 },
        ],
      });

      expect(result.size).toBe(1);
      expect(result.has('วิเคราะห์')).toBe(true);
      const cloIds = result.get('วิเคราะห์')!.map((clo) => clo.loId);
      expect(cloIds.length).toBeGreaterThan(0);
      const allowedIds = new Set([
        MOCK_CLO1_ID,
        MOCK_CLO2_ID,
        MOCK_CLO3_ID,
        MOCK_CLO4_ID,
        MOCK_CLO5_ID,
        MOCK_CLO6_ID,
        MOCK_CLO7_ID,
        MOCK_CLO8_ID,
      ]);
      cloIds.forEach((id) => {
        expect(allowedIds.has(id)).toBeTruthy();
      });
    });

    it('should return no results for non-matching academic years', async () => {
      const { losBySkill: result } = await fixture.repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        academicYearSemesters: [{ academicYear: 2024 }],
      });

      expect(result.size).toBe(1);
      expect(result.has('วิเคราะห์')).toBe(true);
      expect(result.get('วิเคราะห์')).toHaveLength(0);
    });

    it('should return no results for non-matching semesters within a year', async () => {
      const { losBySkill: result } = await fixture.repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        academicYearSemesters: [{ academicYear: 2023, semesters: [2] }],
      });

      expect(result.size).toBe(1);
      expect(result.has('วิเคราะห์')).toBe(true);
      expect(result.get('วิเคราะห์')).toHaveLength(0);
    });

    it('should only include semesters that belong to the specified academic years', async () => {
      // Move course5 and course6 into different semesters and years
      await fixture.prisma.courseOffering.update({
        where: { id: fixture.offering5Id },
        data: { academicYear: 2024, semester: 0 },
      });
      await fixture.prisma.courseOffering.update({
        where: { id: fixture.offering6Id },
        data: { academicYear: 2024, semester: 1 },
      });

      // Create a new CLO that only belongs to course6 (2024 semester 1)
      const EXTRA_CLO_ID = '550e8400-e29b-41d4-a716-446655441111';
      const EXTRA_VECTOR_ID = '550e8400-e29b-41d4-a716-446655441112';
      await insertCourseLearningOutcomeRecord({
        prisma: fixture.prisma,
        id: EXTRA_CLO_ID,
        courseId: fixture.courseId6,
        cloNo: 3,
        originalCloName: 'สามารถวิเคราะห์ข้อมูลเฉพาะทางได้',
        cleanedCloName: 'วิเคราะห์เฉพาะทาง',
        hasEmbedding768: true,
        hasEmbedding1536: false,
      });

      const additionalVector768 = buildVectorFromSequence(
        [0.12, 0.22, 0.32, 0.42, 0.52, 0.62, 0.72, 0.82],
        VECTOR_DIMENSION_768,
      );
      const additionalVector1536 = buildVectorFromSequence(
        [0.12, 0.22, 0.32, 0.42, 0.52, 0.62, 0.72, 0.82],
        VECTOR_DIMENSION_1536,
      );
      await fixture.prisma.$executeRaw`
        INSERT INTO course_learning_outcome_vectors (id, embedded_text, embedding_768, embedding_1536)
        VALUES (${EXTRA_VECTOR_ID}::uuid, 'vector-extra', ${JSON.stringify(additionalVector768)}::vector, ${JSON.stringify(additionalVector1536)}::vector)
      `;

      // Update the extra CLO to reference its vector
      await fixture.prisma.courseLearningOutcome.update({
        where: { id: EXTRA_CLO_ID },
        data: { vectorId: EXTRA_VECTOR_ID },
      });

      const { losBySkill: result } = await fixture.repository.findLosBySkills({
        skills: ['วิเคราะห์'],
        threshold: 0.5,
        topN: 10,
        embeddingConfiguration: {
          model: 'e5-base',
          provider: 'e5',
        },
        academicYearSemesters: [
          { academicYear: 2023, semesters: [1] },
          { academicYear: 2024, semesters: [0] },
        ],
      });

      expect(result.size).toBe(1);
      expect(result.has('วิเคราะห์')).toBe(true);

      const cloIds = result.get('วิเคราะห์')!.map((clo) => clo.loId);
      expect(cloIds.length).toBeGreaterThan(0);
      expect(
        cloIds.every((id) => [MOCK_CLO7_ID, MOCK_CLO8_ID].includes(id)),
      ).toBeTruthy();
      expect(cloIds).not.toContain(EXTRA_CLO_ID);
    });
  });
});
