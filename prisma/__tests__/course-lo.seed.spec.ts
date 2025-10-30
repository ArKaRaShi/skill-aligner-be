import type { PrismaClient } from '@prisma/client';

import { CleanCourseWithCLO } from 'src/modules/course/pipelines/types/clean-course.type';

import { CampusFacultyMap, seedCourseAndLO } from '../seeds/course-lo.seed';

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

const { v4: mockUuidV4 } = jest.requireMock('uuid') as {
  v4: jest.MockedFunction<() => string>;
};

type PrismaMock = {
  course: {
    upsert: jest.Mock;
  };
  courseCLO: {
    create: jest.Mock;
    upsert: jest.Mock;
  };
  courseLearningOutcome: {
    findFirst: jest.Mock;
  };
  $executeRaw: jest.Mock;
};

const createPrismaMock = (): PrismaMock => ({
  course: {
    upsert: jest.fn(),
  },
  courseCLO: {
    create: jest.fn(),
    upsert: jest.fn(),
  },
  courseLearningOutcome: {
    findFirst: jest.fn(),
  },
  $executeRaw: jest.fn(),
});

const createCampusSeed = (): CampusFacultyMap =>
  new Map([[`K-F`, { campusId: 'campus-1', facultyId: 'faculty-1' }]]);

const createCourse = (
  overrides: Partial<CleanCourseWithCLO> = {},
): CleanCourseWithCLO => ({
  academic_year: 2567,
  semester: 1,
  campus_code: 'K',
  faculty_code: 'F',
  subject_code: '02162551-67',
  subject_name_th: 'Course name',
  clo_no: 1,
  original_clo_name_th: 'Original CLO',
  clean_clo_name_th: 'Clean CLO',
  skipEmbedding: false,
  keywords: [],
  ...overrides,
});

describe('seedCourseAndLO', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('throws when campus/faculty mapping is missing', async () => {
    // Arrange
    const prismaMock = createPrismaMock();
    const campusFacultyMap: CampusFacultyMap = new Map();
    const course = createCourse();

    // Act & Assert
    await expect(
      seedCourseAndLO({
        prisma: prismaMock as unknown as PrismaClient,
        campusFacultyMap,
        course,
      }),
    ).rejects.toThrow(
      `Missing campus/faculty mapping for ${course.campus_code}-${course.faculty_code}`,
    );
  });

  it('creates a new learning outcome when none exists for the course', async () => {
    // Arrange
    const prismaMock = createPrismaMock();
    const campusFacultyMap = createCampusSeed();
    const course = createCourse();

    mockUuidV4
      .mockReturnValueOnce('new-course-id')
      .mockReturnValueOnce('new-lo-id')
      .mockReturnValueOnce('new-course-clo-id');

    prismaMock.course.upsert.mockResolvedValue({ id: 'persisted-course-id' });
    prismaMock.courseLearningOutcome.findFirst.mockResolvedValue(null);
    prismaMock.$executeRaw.mockResolvedValue(1);
    prismaMock.courseCLO.create.mockResolvedValue({});

    // Act
    await seedCourseAndLO({
      prisma: prismaMock as unknown as PrismaClient,
      campusFacultyMap,
      course,
    });

    // Assert
    expect(prismaMock.course.upsert).toHaveBeenCalledWith({
      where: {
        unique_course: {
          academicYear: course.academic_year,
          subjectCode: course.subject_code,
          semester: course.semester,
        },
      },
      update: {
        campusId: 'campus-1',
        facultyId: 'faculty-1',
        subjectNameTh: course.subject_name_th,
      },
      create: {
        id: 'new-course-id',
        campusId: 'campus-1',
        facultyId: 'faculty-1',
        academicYear: course.academic_year,
        semester: course.semester,
        subjectCode: course.subject_code,
        subjectNameTh: course.subject_name_th,
      },
    });
    expect(prismaMock.courseLearningOutcome.findFirst).toHaveBeenCalledWith({
      where: {
        cleanedCLONameTh: course.clean_clo_name_th,
      },
    });
    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(1);
    expect(prismaMock.courseCLO.create).toHaveBeenCalledWith({
      data: {
        id: 'new-course-clo-id',
        courseId: 'persisted-course-id',
        cloId: 'new-lo-id',
        cloNo: course.clo_no,
      },
    });
    expect(prismaMock.courseCLO.upsert).not.toHaveBeenCalled();
  });

  it('updates an existing learning outcome when the link already exists', async () => {
    // Arrange
    const prismaMock = createPrismaMock();
    const campusFacultyMap = createCampusSeed();
    const course = createCourse({
      skipEmbedding: true,
      keywords: ['teamwork'],
    });

    mockUuidV4.mockReturnValue('noop-id');

    prismaMock.course.upsert.mockResolvedValue({ id: 'persisted-course-id' });
    prismaMock.courseLearningOutcome.findFirst.mockResolvedValue({
      id: 'existing-lo-id',
    });

    // Act
    await seedCourseAndLO({
      prisma: prismaMock as unknown as PrismaClient,
      campusFacultyMap,
      course,
    });

    // Assert
    expect(prismaMock.courseLearningOutcome.findFirst).toHaveBeenCalled();
    expect(prismaMock.courseCLO.upsert).toHaveBeenCalledWith({
      where: {
        unique_course_clo: {
          courseId: 'persisted-course-id',
          cloId: 'existing-lo-id',
        },
      },
      update: {},
      create: {
        id: 'noop-id',
        courseId: 'persisted-course-id',
        cloId: 'existing-lo-id',
        cloNo: course.clo_no,
      },
    });
    expect(prismaMock.$executeRaw).not.toHaveBeenCalled();
    expect(prismaMock.courseCLO.create).not.toHaveBeenCalled();
  });
});
