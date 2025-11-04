import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/common/adapters/secondary/prisma/prisma.service';
import { Identifier } from 'src/common/domain/types/identifier';

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
    const campuses = await this.prisma.campus.findMany({
      include: {
        linkedFaculties: {
          include: {
            faculty: includeFaculties,
          },
        },
      },
    });

    return campuses.map((campus) => ({
      campusId: campus.id as Identifier,
      code: campus.code,
      nameEn: campus.nameEn,
      nameTh: campus.nameTh,
      createdAt: campus.createdAt,
      updatedAt: campus.updatedAt,
      faculties:
        includeFaculties && campus.linkedFaculties
          ? campus.linkedFaculties.map((link) => ({
              facultyId: link.faculty.id as Identifier,
              code: link.faculty.code,
              nameEn: link.faculty.nameEn,
              nameTh: link.faculty.nameTh,
              createdAt: link.faculty.createdAt,
              updatedAt: link.faculty.updatedAt,
              campuses: [],
              courses: [],
            }))
          : [],
      courses: [],
    }));
  }
}
