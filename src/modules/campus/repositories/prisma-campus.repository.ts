import { Injectable } from '@nestjs/common';

import { Identifier } from 'src/shared/domain/value-objects/identifier';
import { PrismaService } from 'src/shared/kernel/database/prisma.service';

import {
  FindManyInput,
  ICampusRepository,
} from '../contracts/i-campus-repository.contract';
import { Campus } from '../types/campus.type';

@Injectable()
export class PrismaCampusRepository implements ICampusRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany({
    includeFaculties = false,
  }: FindManyInput): Promise<Campus[]> {
    if (includeFaculties) {
      const campusesWithFaculties = await this.prisma.campus.findMany({
        include: {
          faculties: true,
        },
      });

      return campusesWithFaculties.map((campus) => ({
        campusId: campus.id as Identifier,
        code: campus.code,
        nameEn: campus.nameEn,
        nameTh: campus.nameTh,
        createdAt: campus.createdAt,
        updatedAt: campus.updatedAt,
        faculties: campus.faculties.map((faculty) => ({
          facultyId: faculty.id as Identifier,
          code: faculty.code,
          nameEn: faculty.nameEn,
          nameTh: faculty.nameTh,
          createdAt: faculty.createdAt,
          updatedAt: faculty.updatedAt,
          campuses: [],
          courses: [],
        })),
        courses: [],
      }));
    }

    const campuses = await this.prisma.campus.findMany();

    return campuses.map((campus) => ({
      campusId: campus.id as Identifier,
      code: campus.code,
      nameEn: campus.nameEn,
      nameTh: campus.nameTh,
      createdAt: campus.createdAt,
      updatedAt: campus.updatedAt,
      faculties: [],
      courses: [],
    }));
  }
}
