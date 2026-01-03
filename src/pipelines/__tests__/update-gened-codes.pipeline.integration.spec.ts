import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from 'src/shared/kernel/database/prisma.service';
import { v4 as uuidv4 } from 'uuid';

import { FileHelper } from 'src/modules/course/pipelines/helpers/file.helper';
import { ProcessedGenEdRow } from 'src/modules/course/pipelines/types/raw-gened-row.type';

import { UpdateGenEdCodesPipeline } from '../update-gened-codes.pipeline';

// Mock data for testing
const MOCK_CAMPUS_ID = uuidv4();
const MOCK_FACULTY_ID = uuidv4();
const MOCK_COURSE64_ID = uuidv4();
const MOCK_COURSE67_ID = uuidv4();
const MOCK_COURSE_BASE_ID = uuidv4();
const MOCK_COURSE65_ID = uuidv4();
const MOCK_COURSE66_ID = uuidv4();
const MOCK_COURSE68_ID = uuidv4();

const mockGenEdData: ProcessedGenEdRow[] = [
  {
    subject_code: 'GENED101',
    subject_name: 'General Education 101',
    faculty_code: 'FACULTY1',
    has64: true,
    has67: false,
    is_course_closed: false,
  },
  {
    subject_code: 'GENED102',
    subject_name: 'General Education 102',
    faculty_code: 'FACULTY1',
    has64: false,
    has67: true,
    is_course_closed: false,
  },
  {
    subject_code: 'GENED103',
    subject_name: 'General Education 103',
    faculty_code: 'FACULTY1',
    has64: true,
    has67: true,
    is_course_closed: false,
  },
  {
    subject_code: 'GENED104',
    subject_name: 'General Education 104',
    faculty_code: 'FACULTY1',
    has64: false,
    has67: false,
    is_course_closed: false,
  },
  {
    subject_code: 'GENED105',
    subject_name: 'General Education 105',
    faculty_code: 'FACULTY1',
    has64: true,
    has67: true,
    is_course_closed: true, // This should be skipped
  },
];

describe('UpdateGenEdCodesPipeline (Integration)', () => {
  let moduleRef: TestingModule;
  let pipeline: UpdateGenEdCodesPipeline;
  let prisma: PrismaService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [UpdateGenEdCodesPipeline, PrismaService],
    }).compile();

    pipeline = moduleRef.get(UpdateGenEdCodesPipeline);
    prisma = moduleRef.get(PrismaService);
  });

  beforeEach(async () => {
    // Clean database before each test
    await prisma.$executeRaw`TRUNCATE TABLE course_offerings, course_learning_outcome_vectors, course_learning_outcomes, courses, faculties, campuses RESTART IDENTITY CASCADE;`;

    // Reset mock
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  async function seedTestData() {
    // Create campus
    await prisma.campus.create({
      data: {
        id: MOCK_CAMPUS_ID,
        code: 'CAMPUS1',
        nameTh: 'วิทยาเขต 1',
        nameEn: 'Campus 1',
      },
    });

    // Create faculty
    await prisma.faculty.create({
      data: {
        id: MOCK_FACULTY_ID,
        code: 'FACULTY1',
        nameTh: 'คณะ 1',
        nameEn: 'Faculty 1',
        campus: {
          connect: {
            id: MOCK_CAMPUS_ID,
          },
        },
      },
    });

    // Create courses with different suffixes to test the BE year range (64-68)
    await prisma.course.create({
      data: {
        id: MOCK_COURSE64_ID,
        campusId: MOCK_CAMPUS_ID,
        facultyId: MOCK_FACULTY_ID,
        subjectCode: 'GENED101-64',
        subjectName: 'General Education 101',
        isGenEd: false,
      },
    });

    await prisma.course.create({
      data: {
        id: MOCK_COURSE67_ID,
        campusId: MOCK_CAMPUS_ID,
        facultyId: MOCK_FACULTY_ID,
        subjectCode: 'GENED102-67',
        subjectName: 'General Education 102',
        isGenEd: false,
      },
    });

    await prisma.course.create({
      data: {
        id: MOCK_COURSE65_ID,
        campusId: MOCK_CAMPUS_ID,
        facultyId: MOCK_FACULTY_ID,
        subjectCode: 'GENED101-65',
        subjectName: 'General Education 101',
        isGenEd: false,
      },
    });

    await prisma.course.create({
      data: {
        id: MOCK_COURSE66_ID,
        campusId: MOCK_CAMPUS_ID,
        facultyId: MOCK_FACULTY_ID,
        subjectCode: 'GENED101-66',
        subjectName: 'General Education 101',
        isGenEd: false,
      },
    });

    // Create a separate course for GENED101-67
    await prisma.course.create({
      data: {
        id: uuidv4(),
        campusId: MOCK_CAMPUS_ID,
        facultyId: MOCK_FACULTY_ID,
        subjectCode: 'GENED101-67',
        subjectName: 'General Education 101',
        isGenEd: false,
      },
    });

    await prisma.course.create({
      data: {
        id: MOCK_COURSE68_ID,
        campusId: MOCK_CAMPUS_ID,
        facultyId: MOCK_FACULTY_ID,
        subjectCode: 'GENED101-68',
        subjectName: 'General Education 101',
        isGenEd: false,
      },
    });

    await prisma.course.create({
      data: {
        id: MOCK_COURSE_BASE_ID,
        campusId: MOCK_CAMPUS_ID,
        facultyId: MOCK_FACULTY_ID,
        subjectCode: 'GENED104',
        subjectName: 'General Education 104',
        isGenEd: false,
      },
    });
  }

  describe('execute', () => {
    it('should update isGenEd to true for all course suffixes from -64 to current BE year', async () => {
      await seedTestData();

      // Mock FileHelper to return our test data
      jest
        .spyOn(FileHelper, 'loadLatestJson')
        .mockResolvedValue([mockGenEdData[0]]); // GENED101

      await pipeline.execute();

      // Verify all courses with GENED101 prefix were updated (BE years 64-68)
      const course64 = await prisma.course.findUnique({
        where: { subjectCode: 'GENED101-64' },
      });

      const course65 = await prisma.course.findUnique({
        where: { subjectCode: 'GENED101-65' },
      });

      const course66 = await prisma.course.findUnique({
        where: { subjectCode: 'GENED101-66' },
      });

      const course67 = await prisma.course.findUnique({
        where: { subjectCode: 'GENED101-67' },
      });

      const course68 = await prisma.course.findUnique({
        where: { subjectCode: 'GENED101-68' },
      });

      expect(course64).toBeDefined();
      expect(course64?.isGenEd).toBe(true);
      expect(course65).toBeDefined();
      expect(course65?.isGenEd).toBe(true);
      expect(course66).toBeDefined();
      expect(course66?.isGenEd).toBe(true);
      expect(course67).toBeDefined();
      expect(course67?.isGenEd).toBe(true);
      expect(course68).toBeDefined();
      expect(course68?.isGenEd).toBe(true);
    });

    it('should update isGenEd to true for courses regardless of has64/has67 flags', async () => {
      await seedTestData();

      // Mock FileHelper to return GENED104 which has has64: false and has67: false
      jest
        .spyOn(FileHelper, 'loadLatestJson')
        .mockResolvedValue([mockGenEdData[3]]); // GENED104 with both flags false

      await pipeline.execute();

      // Create a course with GENED104-66 suffix to test (within BE range 64-68)
      await prisma.course.create({
        data: {
          id: uuidv4(),
          campusId: MOCK_CAMPUS_ID,
          facultyId: MOCK_FACULTY_ID,
          subjectCode: 'GENED104-66',
          subjectName: 'General Education 104',
          isGenEd: false,
        },
      });

      // Re-run pipeline with GENED104
      await pipeline.execute();

      // Verify course was updated even though flags were false
      const course = await prisma.course.findUnique({
        where: { subjectCode: 'GENED104-66' },
      });

      expect(course).toBeDefined();
      expect(course?.isGenEd).toBe(true);
    });

    it('should skip courses that are marked as closed', async () => {
      await seedTestData();

      // Mock FileHelper to return our test data
      jest
        .spyOn(FileHelper, 'loadLatestJson')
        .mockResolvedValue([mockGenEdData[4]]); // GENED105 with is_course_closed: true

      await pipeline.execute();

      // Verify no courses were updated (should log skip message)
      const courses = await prisma.course.findMany();
      courses.forEach((course) => {
        expect(course.isGenEd).toBe(false);
      });
    });

    it('should handle missing courses gracefully', async () => {
      await seedTestData();

      // Mock FileHelper to return GENED103 but don't create any GENED103 courses
      jest
        .spyOn(FileHelper, 'loadLatestJson')
        .mockResolvedValue([mockGenEdData[2]]); // GENED103

      await pipeline.execute();

      // Should not throw error even though GENED103 courses don't exist
      expect(true).toBe(true); // Test passes if no error is thrown
    });

    it('should process multiple courses in one execution', async () => {
      await seedTestData();

      // Create additional courses for GENED103
      await prisma.course.create({
        data: {
          id: uuidv4(),
          campusId: MOCK_CAMPUS_ID,
          facultyId: MOCK_FACULTY_ID,
          subjectCode: 'GENED103-64',
          subjectName: 'General Education 103',
          isGenEd: false,
        },
      });

      await prisma.course.create({
        data: {
          id: uuidv4(),
          campusId: MOCK_CAMPUS_ID,
          facultyId: MOCK_FACULTY_ID,
          subjectCode: 'GENED103-67',
          subjectName: 'General Education 103',
          isGenEd: false,
        },
      });

      // Mock FileHelper to return our test data
      jest
        .spyOn(FileHelper, 'loadLatestJson')
        .mockResolvedValue(mockGenEdData.slice(0, 3)); // First 3 courses (excluding closed and no-flags)

      await pipeline.execute();

      // Verify courses were updated
      const course101_64 = await prisma.course.findUnique({
        where: { subjectCode: 'GENED101-64' },
      });

      const course102_67 = await prisma.course.findUnique({
        where: { subjectCode: 'GENED102-67' },
      });

      const course103_64 = await prisma.course.findUnique({
        where: { subjectCode: 'GENED103-64' },
      });

      const course103_67 = await prisma.course.findUnique({
        where: { subjectCode: 'GENED103-67' },
      });

      expect(course101_64?.isGenEd).toBe(true);
      expect(course102_67?.isGenEd).toBe(true);
      expect(course103_64?.isGenEd).toBe(true);
      expect(course103_67?.isGenEd).toBe(true);
    });
  });
});
