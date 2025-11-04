import { plainToInstance } from 'class-transformer';

import { FacultyResponseDto } from '../faculty/dto/responses/faculty.response.dto';
import { CampusWithFacultiesResponseDto } from './dto/responses/campuses-with-faculties.response.dto';
import { Campus } from './types/campus.type';

export class CampusResponseMapper {
  static toCampusWithFacultiesResponseDtoList(
    campuses: Campus[],
  ): CampusWithFacultiesResponseDto[] {
    return campuses.map((campus) => {
      // TODO: move this faculty mapping to FacultyResponseMapper
      const facultyResponseDtoList: FacultyResponseDto[] = campus.faculties.map(
        (faculty) => {
          const facultyResponseDto: FacultyResponseDto = {
            facultyId: faculty.facultyId,
            facultyCode: faculty.code,
            facultyNameEn: faculty.nameEn,
            facultyNameTh: faculty.nameTh,
            createdAt: faculty.createdAt,
            updatedAt: faculty.updatedAt,
          };
          return plainToInstance(FacultyResponseDto, facultyResponseDto, {
            excludeExtraneousValues: true,
          });
        },
      );
      const campusResponseDto: CampusWithFacultiesResponseDto = {
        campusId: campus.campusId,
        campusCode: campus.code,
        campusNameEn: campus.nameEn,
        campusNameTh: campus.nameTh,
        createdAt: campus.createdAt,
        updatedAt: campus.updatedAt,
        faculties: facultyResponseDtoList,
      };

      return plainToInstance(
        CampusWithFacultiesResponseDto,
        campusResponseDto,
        {
          excludeExtraneousValues: true,
        },
      );
    });
  }
}
