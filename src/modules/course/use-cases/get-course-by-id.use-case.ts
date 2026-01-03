import { Inject, Injectable } from '@nestjs/common';

import { IUseCase } from 'src/shared/contracts/i-use-case.contract';

import {
  I_COURSE_REPOSITORY_TOKEN,
  ICourseRepository,
} from '../contracts/i-course-repository.contract';
import {
  GetCourseByIdUseCaseInput,
  GetCourseByIdUseCaseOutput,
} from './types/get-course-by-id.use-case.type';

@Injectable()
export class GetCourseByIdUseCase
  implements IUseCase<GetCourseByIdUseCaseInput, GetCourseByIdUseCaseOutput>
{
  constructor(
    @Inject(I_COURSE_REPOSITORY_TOKEN)
    private readonly courseRepository: ICourseRepository,
  ) {}

  async execute({
    courseId,
  }: GetCourseByIdUseCaseInput): Promise<GetCourseByIdUseCaseOutput> {
    const course = await this.courseRepository.findByIdOrThrow(courseId);
    return { course };
  }
}
