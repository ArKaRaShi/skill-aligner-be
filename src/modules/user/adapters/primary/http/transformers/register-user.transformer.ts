import { RegisterUserResultDto } from 'src/modules/user/core/application/dto/result';

import { UserResponseDto } from '../dto/responses';

/**
 * Transforms RegisterUserResultDto to UserResponseDto.
 */
export class RegisterUserTransformer {
  static toResponseDto(result: RegisterUserResultDto): UserResponseDto {
    const { id, email, createdAt, updatedAt } = result;
    return {
      id,
      email,
      createdAt,
      updatedAt,
    };
  }

  static toResponseDtoList(
    results: RegisterUserResultDto[],
  ): UserResponseDto[] {
    return results.map((result) => this.toResponseDto(result));
  }
}
