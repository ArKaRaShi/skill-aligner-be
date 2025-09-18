import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';

type Props<T> = {
  message: string;
  data: T;
};

/**
 * Base response DTO to standardize API responses.
 */
@ApiExtraModels()
export class BaseResponseDto<T> {
  /**
   * Creates an instance of BaseResponseDto.
   * @param props - Properties to initialize the response DTO.
   */
  constructor(props: Props<T>) {
    this.message = props.message;
    this.data = props.data;
  }

  // TODO: Use custom response property decorator
  @ApiProperty({ example: 'Operation successful' })
  message: string;

  // TODO: Use custom response property decorator
  @ApiProperty({ nullable: true })
  data: T;
}
