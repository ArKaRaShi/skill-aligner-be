import { PrismaCourseMapper } from '../prisma-course.mapper';
import {
  RawCourseCLO,
  RawCourseLearningOutcome,
  RawCourseWithCLOs,
} from '../types/raw-course.type';

const courseCreatedAt = new Date('2024-01-01T00:00:00.000Z');
const courseUpdatedAt = new Date('2024-01-02T00:00:00.000Z');
const cloCreatedAt = new Date('2024-02-01T00:00:00.000Z');
const cloUpdatedAt = new Date('2024-02-02T00:00:00.000Z');

const createLearningOutcome = (
  overrides: Partial<RawCourseLearningOutcome> = {},
): RawCourseLearningOutcome => ({
  id: 'clo-1',
  original_clo_name: 'Original CLO TH',
  original_clo_name_en: 'Original CLO EN',
  cleaned_clo_name_th: 'Cleaned CLO TH',
  cleaned_clo_name_en: 'Cleaned CLO EN',
  embedding: [0.1, 0.2, 0.3],
  skip_embedding: false,
  is_embedded: true,
  metadata: { source: 'unit-test' },
  created_at: cloCreatedAt,
  updated_at: cloUpdatedAt,
  ...overrides,
});

const createCourseCLO = (
  overrides: Partial<RawCourseCLO> = {},
): RawCourseCLO => ({
  id: 'course-clo-1',
  course_id: 'course-1',
  clo_id: 'clo-1',
  clo_no: 1,
  created_at: cloCreatedAt,
  updated_at: cloUpdatedAt,
  course: null,
  learning_outcome: createLearningOutcome(),
  ...overrides,
});

const createRawCourse = (
  overrides: Partial<RawCourseWithCLOs> = {},
): RawCourseWithCLOs => ({
  id: 'course-1',
  campus_id: 'campus-1',
  faculty_id: 'faculty-1',
  academic_year: 2024,
  semester: 2,
  subject_code: 'SUBJ101',
  subject_name_th: 'Subject TH',
  subject_name_en: 'Subject',
  metadata: { level: 'advanced' },
  created_at: courseCreatedAt,
  updated_at: courseUpdatedAt,
  course_clos: [],
  ...overrides,
});

describe('PrismaCourseMapper', () => {
  it('should map a raw course with valid CLOs to the domain CourseMatch', () => {
    // Arrange
    const rawCourse = createRawCourse({
      course_clos: [
        createCourseCLO({
          clo_no: 3,
          learning_outcome: createLearningOutcome({
            id: 'clo-42',
            cleaned_clo_name_en: null,
            metadata: null,
          }),
        }),
      ],
    });

    // Act
    const domainCourse = PrismaCourseMapper.toDomain(rawCourse);

    // Assert
    expect(domainCourse).toEqual({
      courseId: 'course-1',
      campusId: 'campus-1',
      facultyId: 'faculty-1',
      academicYear: 2024,
      semester: 2,
      subjectCode: 'SUBJ101',
      subjectNameEn: 'Subject',
      subjectNameTh: 'Subject TH',
      metadata: { level: 'advanced' },
      createdAt: courseCreatedAt,
      updatedAt: courseUpdatedAt,
      cloMatches: [
        {
          cloId: 'clo-42',
          courseId: 'course-1',
          cloNo: 3,
          originalCLONameTh: 'Original CLO TH',
          originalCLONameEn: 'Original CLO EN',
          cleanedCLONameTh: 'Cleaned CLO TH',
          cleanedCLONameEn: null,
          embedding: [0.1, 0.2, 0.3],
          skipEmbedding: false,
          isEmbedded: true,
          metadata: null,
          createdAt: cloCreatedAt,
          updatedAt: cloUpdatedAt,
          similarityScore: 0,
        },
      ],
    });
  });

  it('should ignore CLOs without a learning outcome', () => {
    // Arrange
    const rawCourse = createRawCourse({
      course_clos: [
        createCourseCLO({ learning_outcome: null }),
        createCourseCLO({
          id: 'course-clo-2',
          clo_no: 5,
          learning_outcome: createLearningOutcome({ id: 'clo-99' }),
        }),
      ],
    });

    // Act
    const domainCourse = PrismaCourseMapper.toDomain(rawCourse);

    // Assert
    expect(domainCourse.cloMatches).toHaveLength(1);
    expect(domainCourse.cloMatches[0]).toMatchObject({
      cloId: 'clo-99',
      cloNo: 5,
    });
  });

  it('should return an empty CLO list when raw CLOs are missing', () => {
    // Arrange
    const rawCourse = createRawCourse({
      course_clos: null as unknown as RawCourseCLO[],
    });

    // Act
    const domainCourse = PrismaCourseMapper.toDomain(rawCourse);

    // Assert
    expect(domainCourse.cloMatches).toEqual([]);
  });

  it('should map null metadata and optional subject names through to the domain object', () => {
    // Arrange
    const rawCourse = createRawCourse({
      metadata: null,
      subject_name_en: null,
      course_clos: [
        createCourseCLO({
          learning_outcome: createLearningOutcome({
            original_clo_name_en: null,
            cleaned_clo_name_en: null,
            metadata: null,
          }),
        }),
      ],
    });

    // Act
    const domainCourse = PrismaCourseMapper.toDomain(rawCourse);

    // Assert
    expect(domainCourse.metadata).toBeNull();
    expect(domainCourse.subjectNameEn).toBeNull();
    expect(domainCourse.cloMatches[0]).toMatchObject({
      originalCLONameEn: null,
      cleanedCLONameEn: null,
      metadata: null,
    });
  });

  it('should ignore falsy entries in the CLO collection', () => {
    // Arrange
    const rawCourse = createRawCourse({
      course_clos: [
        undefined,
        null,
        createCourseCLO({
          id: 'course-clo-valid',
          learning_outcome: createLearningOutcome({ id: 'clo-valid' }),
        }),
      ] as unknown as RawCourseCLO[],
    });

    // Act
    const domainCourse = PrismaCourseMapper.toDomain(rawCourse);

    // Assert
    expect(domainCourse.cloMatches).toHaveLength(1);
    expect(domainCourse.cloMatches[0].cloId).toBe('clo-valid');
  });
});
