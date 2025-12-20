import { PrismaCourseMapper } from '../mappers/prisma-course.mapper';
import { RawCourseWithCLOs } from '../types/raw-course.type';

const baseDate = new Date('2024-01-01T00:00:00.000Z');

const buildRawCourse = (
  overrides: Partial<RawCourseWithCLOs> = {},
): RawCourseWithCLOs => ({
  id: 'course-1',
  campus_id: 'campus-1',
  faculty_id: 'faculty-1',
  subject_code: 'CS101',
  subject_name: 'Intro to CS',
  is_gen_ed: true,
  created_at: baseDate,
  updated_at: baseDate,
  metadata: { level: 'beginner' },
  course_clos: [],
  ...overrides,
});

describe('PrismaCourseMapper', () => {
  it('maps core course fields to the domain Course shape', () => {
    const rawCourse = buildRawCourse();

    const result = PrismaCourseMapper.toDomain(rawCourse);

    expect(result).toMatchObject({
      id: 'course-1',
      campusId: 'campus-1',
      facultyId: 'faculty-1',
      subjectCode: 'CS101',
      subjectName: 'Intro to CS',
      isGenEd: true,
      metadata: { level: 'beginner' },
      createdAt: baseDate,
      updatedAt: baseDate,
    });
  });

  it('defaults metadata and related collections when not provided', () => {
    const rawCourse = buildRawCourse({
      metadata: null,
      course_clos: [
        {
          id: 'course-clo-1',
          course_id: 'course-1',
          clo_id: 'clo-1',
          clo_no: 1,
          created_at: baseDate,
          updated_at: baseDate,
          course: null,
          learning_outcome: null,
        },
      ],
    });

    const result = PrismaCourseMapper.toDomain(rawCourse);

    expect(result.metadata).toBeNull();
    expect(result.courseLearningOutcomes).toEqual([]);
    expect(result.courseOfferings).toEqual([]);
    expect(result.courseClickLogs).toEqual([]);
  });
});
