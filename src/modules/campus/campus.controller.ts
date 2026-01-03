import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { BaseResponseDto } from 'src/shared/api/dto/responses/base.response.dto';

import { CampusResponseMapper } from './campus-response.mapper';
import { GetCampusesQueryRequestDto } from './dto/requests/get-campuses-query.request.dto';
import { CampusWithFacultiesResponseDto } from './dto/responses/campuses-with-faculties.response.dto';
import { GetCampusesUseCase } from './use-cases/get-campuses.use-case';

@Controller('campuses')
@ApiTags('Campuses')
export class CampusController {
  constructor(private readonly getCampusesUseCase: GetCampusesUseCase) {}

  @Get()
  async getCampuses(
    @Query() { includeFaculties }: GetCampusesQueryRequestDto,
  ): Promise<BaseResponseDto<CampusWithFacultiesResponseDto[]>> {
    const { campuses } = await this.getCampusesUseCase.execute({
      includeFaculties,
    });

    return new BaseResponseDto({
      message: 'Campuses retrieved successfully',
      data: CampusResponseMapper.toCampusWithFacultiesResponseDtoList(campuses),
    });
  }
}
