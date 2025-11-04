import { Inject, Injectable } from '@nestjs/common';

import {
  I_CAMPUS_REPOSITORY,
  ICampusRepository,
} from '../contracts/i-campus-repository.contract';
import {
  GetCampusesUseCaseInput,
  GetCampusesUseCaseOutput,
} from './types/get-campuses.use-case.type';

@Injectable()
export class GetCampusesUseCase {
  constructor(
    @Inject(I_CAMPUS_REPOSITORY)
    private readonly campusRepository: ICampusRepository,
  ) {}

  async execute({
    includeFaculties,
  }: GetCampusesUseCaseInput): Promise<GetCampusesUseCaseOutput> {
    const campuses = await this.campusRepository.findMany({
      includeFaculties,
    });
    return { campuses };
  }
}
