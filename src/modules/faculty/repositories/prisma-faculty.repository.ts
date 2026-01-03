import { Injectable } from '@nestjs/common';

import { Identifier } from 'src/shared/domain/value-objects/identifier';
import { PrismaService } from 'src/shared/kernel/database/prisma.service';

import { IFacultyRepository } from '../contracts/i-faculty.contract';
import { Faculty } from '../types/faculty.type';

@Injectable()
export class PrismaFacultyRepository implements IFacultyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(): Promise<Faculty[]> {
    const faculties = await this.prisma.faculty.findMany();
    return faculties.map((faculty) => ({
      facultyId: faculty.id as Identifier,
      code: faculty.code,
      nameEn: faculty.nameEn,
      nameTh: faculty.nameTh,
      createdAt: faculty.createdAt,
      updatedAt: faculty.updatedAt,
      campuses: [],
      courses: [],
    }));
  }
}
