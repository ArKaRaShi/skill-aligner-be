import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { SuccessResponseDto } from 'src/shared/contracts/api/base.response.dto';

import { CampusResponseMapper } from './campus-response.mapper';
import { GetCampusesQueryRequestDto } from './dto/requests/get-campuses-query.request.dto';
import { CampusWithFacultiesResponseDto } from './dto/responses/campuses-with-faculties.response.dto';
import { GetCampusesUseCase } from './use-cases/get-campuses.use-case';

@Controller('campuses')
@Throttle({ default: { limit: 5, ttl: 60000 } })
@ApiTags('Campuses')
export class CampusController {
  constructor(private readonly getCampusesUseCase: GetCampusesUseCase) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getCampuses(
    @Query() { includeFaculties }: GetCampusesQueryRequestDto,
  ): Promise<SuccessResponseDto<CampusWithFacultiesResponseDto[]>> {
    const { campuses } = await this.getCampusesUseCase.execute({
      includeFaculties,
    });

    return new SuccessResponseDto({
      message: 'Campuses retrieved successfully',
      data: CampusResponseMapper.toCampusWithFacultiesResponseDtoList(campuses),
    });
  }
}
