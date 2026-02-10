import { plainToInstance } from 'class-transformer';

import { FacultyViewResponseDto } from './dto/responses/faculty-view.response.dto';
import { Faculty } from './types/faculty.type';

export class FacultyResponseMapper {
  static toFacultyViewResponseDto(faculty: Faculty): FacultyViewResponseDto {
    const facultyView: FacultyViewResponseDto = {
      id: faculty.facultyId,
      code: faculty.code,
      name: faculty.nameTh,
    };

    return plainToInstance(FacultyViewResponseDto, facultyView, {
      excludeExtraneousValues: true,
    });
  }
}
