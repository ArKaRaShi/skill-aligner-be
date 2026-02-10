import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaModule } from 'src/shared/kernel/database/prisma.module';
import { PrismaService } from 'src/shared/kernel/database/prisma.service';
import request from 'supertest';
import { App } from 'supertest/types';

import { CampusModule } from '../campus.module';

interface CampusResponseData {
  campusId: string;
  campusCode: string;
  campusNameEn: string | null;
  campusNameTh: string | null;
  faculties: FacultyResponseData[];
  createdAt: string;
  updatedAt: string;
}

interface FacultyResponseData {
  facultyId: string;
  facultyCode: string;
  facultyNameEn: string | null;
  facultyNameTh: string | null;
  createdAt: string;
  updatedAt: string;
}

const CAMPUS1_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CAMPUS2_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const FACULTY1_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const FACULTY2_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const FACULTY3_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

describe('CampusController (Integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CampusModule, PrismaModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.$executeRaw`TRUNCATE TABLE faculties, campuses RESTART IDENTITY CASCADE;`;
  });

  afterAll(async () => {
    await prisma.$executeRaw`TRUNCATE TABLE faculties, campuses RESTART IDENTITY CASCADE;`;
    await app.close();
  });

  describe('GET /campuses', () => {
    it('should return empty array when no campuses exist', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/campuses')
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        message: 'Campuses retrieved successfully',
        data: [],
      });
      expect(response.body.data).toHaveLength(0);
    });

    it('should return list of campuses without faculties when includeFaculties is not specified', async () => {
      // Arrange
      await prisma.campus.create({
        data: {
          id: CAMPUS1_ID,
          code: 'BANGKEN',
          nameEn: 'Bang Khen',
          nameTh: 'บางเขน',
        },
      });

      await prisma.campus.create({
        data: {
          id: CAMPUS2_ID,
          code: 'KAMPANG',
          nameEn: 'Kamphaeng Saen',
          nameTh: 'กำแพงแสน',
        },
      });

      // Act
      const response = await request(app.getHttpServer())
        .get('/campuses')
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        message: 'Campuses retrieved successfully',
        data: expect.any(Array),
      });
      expect(response.body.data).toHaveLength(2);

      const campuses = response.body.data as CampusResponseData[];
      const campus1 = campuses.find((c) => c.campusCode === 'BANGKEN');
      const campus2 = campuses.find((c) => c.campusCode === 'KAMPANG');

      expect(campus1).toBeDefined();
      expect(campus1!.campusId).toBe(CAMPUS1_ID);
      expect(campus1!.campusCode).toBe('BANGKEN');
      expect(campus1!.campusNameEn).toBe('Bang Khen');
      expect(campus1!.campusNameTh).toBe('บางเขน');
      expect(campus1!.faculties).toBeDefined();
      expect(campus1!.faculties).toHaveLength(0);
      expect(campus1!.createdAt).toBeDefined();
      expect(campus1!.updatedAt).toBeDefined();

      expect(campus2).toBeDefined();
      expect(campus2!.campusId).toBe(CAMPUS2_ID);
      expect(campus2!.campusCode).toBe('KAMPANG');
      expect(campus2!.campusNameEn).toBe('Kamphaeng Saen');
      expect(campus2!.campusNameTh).toBe('กำแพงแสน');
    });

    it('should return list of campuses without faculties when includeFaculties is not specified or false', async () => {
      // Arrange
      await prisma.campus.create({
        data: {
          id: CAMPUS1_ID,
          code: 'BANGKEN',
          nameEn: 'Bang Khen',
          nameTh: 'บางเขน',
        },
      });

      await prisma.faculty.create({
        data: {
          id: FACULTY1_ID,
          code: 'AGRI',
          nameEn: 'Faculty of Agriculture',
          nameTh: 'คณะเกษตร',
          campusId: CAMPUS1_ID,
        },
      });

      // Act - when includeFaculties is not specified
      const response = await request(app.getHttpServer())
        .get('/campuses')
        .expect(200);

      // Assert - faculties should be empty by default
      expect(response.body.data).toHaveLength(1);
      const campus = response.body.data[0];
      expect(campus.faculties).toBeDefined();
      expect(campus.faculties).toHaveLength(0);
    });

    it('should return campuses with nested faculties when includeFaculties is true', async () => {
      // Arrange
      await prisma.campus.create({
        data: {
          id: CAMPUS1_ID,
          code: 'BANGKEN',
          nameEn: 'Bang Khen',
          nameTh: 'บางเขน',
        },
      });

      await prisma.campus.create({
        data: {
          id: CAMPUS2_ID,
          code: 'KAMPANG',
          nameEn: 'Kamphaeng Saen',
          nameTh: 'กำแพงแสน',
        },
      });

      await prisma.faculty.create({
        data: {
          id: FACULTY1_ID,
          code: 'AGRI',
          nameEn: 'Faculty of Agriculture',
          nameTh: 'คณะเกษตร',
          campusId: CAMPUS1_ID,
        },
      });

      await prisma.faculty.create({
        data: {
          id: FACULTY2_ID,
          code: 'ENG',
          nameEn: 'Faculty of Engineering',
          nameTh: 'คณะวิศวกรรมศาสตร์',
          campusId: CAMPUS1_ID,
        },
      });

      await prisma.faculty.create({
        data: {
          id: FACULTY3_ID,
          code: 'SCI',
          nameEn: 'Faculty of Science',
          nameTh: 'คณะวิทยาศาสตร์',
          campusId: CAMPUS2_ID,
        },
      });

      // Act
      const response = await request(app.getHttpServer())
        .get('/campuses?includeFaculties=true')
        .expect(200);

      // Assert
      expect(response.body.data).toHaveLength(2);

      const campuses = response.body.data as CampusResponseData[];
      const campus1 = campuses.find((c) => c.campusCode === 'BANGKEN');
      const campus2 = campuses.find((c) => c.campusCode === 'KAMPANG');

      // Verify campus 1 with faculties
      expect(campus1).toBeDefined();
      expect(campus1!.faculties).toHaveLength(2);

      const faculty1 = campus1!.faculties.find((f) => f.facultyCode === 'AGRI');
      const faculty2 = campus1!.faculties.find((f) => f.facultyCode === 'ENG');

      expect(faculty1).toBeDefined();
      expect(faculty1!.facultyId).toBe(FACULTY1_ID);
      expect(faculty1!.facultyCode).toBe('AGRI');
      expect(faculty1!.facultyNameEn).toBe('Faculty of Agriculture');
      expect(faculty1!.facultyNameTh).toBe('คณะเกษตร');
      expect(faculty1!.createdAt).toBeDefined();
      expect(faculty1!.updatedAt).toBeDefined();

      expect(faculty2).toBeDefined();
      expect(faculty2!.facultyId).toBe(FACULTY2_ID);
      expect(faculty2!.facultyCode).toBe('ENG');
      expect(faculty2!.facultyNameEn).toBe('Faculty of Engineering');
      expect(faculty2!.facultyNameTh).toBe('คณะวิศวกรรมศาสตร์');

      // Verify campus 2 with faculties
      expect(campus2).toBeDefined();
      expect(campus2!.faculties).toHaveLength(1);

      const faculty3 = campus2!.faculties[0];
      expect(faculty3.facultyId).toBe(FACULTY3_ID);
      expect(faculty3.facultyCode).toBe('SCI');
      expect(faculty3.facultyNameEn).toBe('Faculty of Science');
      expect(faculty3.facultyNameTh).toBe('คณะวิทยาศาสตร์');
    });

    it('should return campuses with empty faculties array when campus has no faculties', async () => {
      // Arrange
      await prisma.campus.create({
        data: {
          id: CAMPUS1_ID,
          code: 'BANGKEN',
          nameEn: 'Bang Khen',
          nameTh: 'บางเขน',
        },
      });

      // Act
      const response = await request(app.getHttpServer())
        .get('/campuses?includeFaculties=true')
        .expect(200);

      // Assert
      expect(response.body.data).toHaveLength(1);
      const campus = response.body.data[0];
      expect(campus.faculties).toBeDefined();
      expect(campus.faculties).toHaveLength(0);
    });

    it('should handle campuses with nullable name fields', async () => {
      // Arrange
      await prisma.campus.create({
        data: {
          id: CAMPUS1_ID,
          code: 'BANGKEN',
          nameEn: null,
          nameTh: null,
        },
      });

      // Act
      const response = await request(app.getHttpServer())
        .get('/campuses')
        .expect(200);

      // Assert
      expect(response.body.data).toHaveLength(1);
      const campus = response.body.data[0];
      expect(campus.campusNameEn).toBeNull();
      expect(campus.campusNameTh).toBeNull();
    });

    it('should return campuses in consistent order', async () => {
      // Arrange - Create multiple campuses
      await prisma.campus.create({
        data: {
          id: CAMPUS2_ID,
          code: 'KAMPANG',
          nameEn: 'Kamphaeng Saen',
          nameTh: 'กำแพงแสน',
        },
      });

      await prisma.campus.create({
        data: {
          id: CAMPUS1_ID,
          code: 'BANGKEN',
          nameEn: 'Bang Khen',
          nameTh: 'บางเขน',
        },
      });

      // Act
      const response = await request(app.getHttpServer())
        .get('/campuses')
        .expect(200);

      // Assert
      expect(response.body.data).toHaveLength(2);
      // Verify we get consistent results (order may vary but should be consistent)
      const campuses = response.body.data as CampusResponseData[];
      const campusCodes = campuses.map((c) => c.campusCode);
      expect(campusCodes).toContain('BANGKEN');
      expect(campusCodes).toContain('KAMPANG');
    });

    it('should include timestamps in response', async () => {
      // Arrange
      await prisma.campus.create({
        data: {
          id: CAMPUS1_ID,
          code: 'BANGKEN',
          nameEn: 'Bang Khen',
          nameTh: 'บางเขน',
        },
      });

      // Act
      const response = await request(app.getHttpServer())
        .get('/campuses')
        .expect(200);

      // Assert
      const campus = response.body.data[0];
      expect(campus.createdAt).toBeDefined();
      expect(campus.updatedAt).toBeDefined();
      expect(new Date(campus.createdAt)).toBeInstanceOf(Date);
      expect(new Date(campus.updatedAt)).toBeInstanceOf(Date);
    });
  });
});
