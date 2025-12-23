import { Injectable } from '@nestjs/common';

import { v4 as uuidv4 } from 'uuid';

import { PrismaService } from 'src/common/adapters/secondary/prisma/prisma.service';

import { FileHelper } from 'src/modules/course/pipelines/helpers/file.helper';
import { CleanCourseWithCLO } from 'src/modules/course/pipelines/types/clean-course.type';

export type CampusFacultyMap = Map<
  string,
  { campusId: string; facultyId: string }
>;

@Injectable()
export class SeedCampusAndFacultyPipeline {
  private readonly campusCodeToNameMap: Map<string, string> = new Map([
    ['C', 'เฉลิมพระเกียรติ จังหวัดสกลนคร'],
    ['K', 'กำแพงแสน'],
    ['P', 'สุพรรณบุรี'],
    ['B', 'บางเขน'],
    ['S', 'ศรีราชา'],
  ]);

  private readonly campusFacultyCodesToNameMap: Map<
    string,
    Map<string, string>
  > = new Map([
    [
      'C',
      new Map<string, string>([
        ['A', 'คณะทรัพยากรธรรมชาติและอุตสาหกรรมเกษตร'],
        ['B', 'คณะวิทยาศาสตร์และวิศวกรรมศาสตร์'],
        ['C', 'คณะศิลปศาสตร์และวิทยาการจัดการ'],
        ['X', 'ส่วนกลางวิทยาเขตเฉลิมพระเกียรติ จังหวัดสกลนคร'],
      ]),
    ],
    [
      'K',
      new Map<string, string>([
        ['A', 'คณะเกษตร'],
        ['S', 'คณะวิทยาศาสตร์การกีฬา'],
        ['E', 'คณะวิศวกรรมศาสตร์'],
        ['Q', 'คณะศิลปศาสตร์และวิทยาศาสตร์'],
        ['F', 'คณะศึกษาศาสตร์'],
        ['I', 'คณะสัตวแพทยศาสตร์'],
        ['X', 'บัณฑิตวิทยาลัย'],
      ]),
    ],

    [
      'B',
      new Map<string, string>([
        ['A', 'คณะเกษตร'],
        ['P', 'คณะเทคนิคการสัตวแพทย์'],
        ['N', 'คณะบริหารธุรกิจ'],
        ['B', 'คณะประมง'],
        ['L', 'คณะมนุษยศาสตร์'],
        ['C', 'คณะวนศาสตร์'],
        ['D', 'คณะวิทยาศาสตร์'],
        ['E', 'คณะวิศวกรรมศาสตร์'],
        ['F', 'คณะศึกษาศาสตร์'],
        ['G', 'คณะเศรษฐศาสตร์'],
        ['R', 'คณะสถาปัตยกรรมศาสตร์'],
        ['H', 'คณะสังคมศาสตร์'],
        ['I', 'คณะสัตวแพทยศาสตร์'],
        ['K', 'คณะอุตสาหกรรมเกษตร'],
        ['X', 'บัณฑิตวิทยาลัย'],
        ['Q', 'วิทยาลัยสิ่งแวดล้อม'],
      ]),
    ],
    [
      'P',
      new Map<string, string>([
        ['A', 'สำนักงานโครงการจัดตั้งวิทยาเขตสุพรรณบุรี'],
      ]),
    ],
    [
      'S',
      new Map<string, string>([
        ['D', 'คณะวิทยาศาสตร์'],
        ['S', 'คณะทรัพยากรและสิ่งแวดล้อม'],
        ['R', 'คณะวิทยาการจัดการ'],
        ['T', 'คณะวิศวกรรมศาสตร์'],
        ['X', 'บัณฑิตวิทยาลัย'],
        ['M', 'วิทยาลัยพาณิชยนาวีนานาชาติ'],
      ]),
    ],
  ]);

  constructor(private readonly prisma: PrismaService) {}

  async seedCampusAndFaculty({
    campusCode,
    facultyCode,
  }: {
    campusCode: string;
    facultyCode: string;
  }) {
    await this.prisma.$transaction(async (tx) => {
      // First, get or create the campus
      const { id: campusId } = await tx.campus.upsert({
        where: {
          code: campusCode,
        },
        update: {
          nameTh: this.campusCodeToNameMap.get(campusCode),
        },
        create: {
          id: uuidv4(),
          code: campusCode,
          nameTh: this.campusCodeToNameMap.get(campusCode),
        },
      });

      // Then, create faculty that belongs to this specific campus
      const facultyName = this.campusFacultyCodesToNameMap
        .get(campusCode)
        ?.get(facultyCode);

      await tx.faculty.upsert({
        where: {
          unique_campus_faculty_code: {
            campusId,
            code: facultyCode,
          },
        },
        update: {
          nameTh: facultyName,
        },
        create: {
          id: uuidv4(),
          code: facultyCode,
          nameTh: facultyName,
          campusId,
        },
      });
    });
  }

  async execute({
    deleteExisting = false,
    seeds = false,
  }: {
    deleteExisting?: boolean;
    seeds?: boolean;
  }) {
    const cleanedCoursesWithCLO: CleanCourseWithCLO[] =
      await FileHelper.loadLatestJson<CleanCourseWithCLO[]>(
        'src/modules/course/pipelines/data/cleaned/valid_courses_with_clo',
      );

    if (deleteExisting) {
      console.log(`Deleting existing faculties...`);
      await this.prisma.faculty.deleteMany({});
      console.log(`Deleting existing campuses...`);
      await this.prisma.campus.deleteMany({});
    }

    console.log(`Building unique campus-faculty pairs...`);
    const uniquePairs = new Map<string, Set<string>>();

    // Collect unique campus-faculty pairs
    for (const course of cleanedCoursesWithCLO) {
      if (!uniquePairs.has(course.campus_code)) {
        uniquePairs.set(course.campus_code, new Set());
      }
      uniquePairs.get(course.campus_code)!.add(course.faculty_code);
    }

    if (seeds) {
      console.log(`Seeding campus-faculty pairs...`);
      for (const [campusCode, faculties] of uniquePairs.entries()) {
        for (const facultyCode of faculties) {
          console.log(
            `- Seeding campus: ${campusCode}, faculty: ${facultyCode}`,
          );
          await this.seedCampusAndFaculty({
            campusCode,
            facultyCode,
          });
        }
      }
    }

    console.log(`✅ Seeding campus-faculty pairs completed.`);
  }
}
