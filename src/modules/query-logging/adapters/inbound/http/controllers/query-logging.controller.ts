import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { SuccessResponseDto } from 'src/shared/contracts/api/base.response.dto';

import { DeleteQueryLogByIdUseCase } from '../../../../application/use-cases/delete-query-log-by-id.use-case';
import { GetQueryLogByIdUseCase } from '../../../../application/use-cases/get-query-log-by-id.use-case';
import { ListQueryLogsUseCase } from '../../../../application/use-cases/list-query-logs.use-case';
import { ListQueryLogsQueryRequestDto } from '../dto/requests/list-query-logs.query.request.dto';
import { QueryLogDetailResponseDto } from '../dto/responses/query-log-detail-response.dto';
import { QueryLogsListResponseDto } from '../dto/responses/query-logs-list-response.dto';
import { QueryLogResponseMapper } from '../mappers/query-log-response.mapper';

@Controller('query-logs')
@Throttle({ default: { limit: 5, ttl: 60000 } })
@ApiTags('Query Logs')
export class QueryLoggingController {
  constructor(
    private readonly listQueryLogsUseCase: ListQueryLogsUseCase,
    private readonly getQueryLogByIdUseCase: GetQueryLogByIdUseCase,
    private readonly deleteQueryLogByIdUseCase: DeleteQueryLogByIdUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List query logs',
    description: 'Retrieve paginated list of query logs with optional filters',
  })
  async listQueryLogs(
    @Query() queryDto: ListQueryLogsQueryRequestDto,
  ): Promise<SuccessResponseDto<QueryLogsListResponseDto>> {
    const {
      page = 1,
      pageSize = 20,
      status,
      startDate,
      endDate,
      search,
    } = queryDto;

    const { logs, totalItems } = await this.listQueryLogsUseCase.execute({
      page,
      pageSize,
      status,
      startDate,
      endDate,
      search,
    });

    const responseDto = QueryLogResponseMapper.toListResponseDto(
      logs,
      totalItems,
      page,
      pageSize,
      {
        status,
        startDate,
        endDate,
        search,
      },
    );

    return new SuccessResponseDto<QueryLogsListResponseDto>({
      message: 'Query logs retrieved successfully',
      data: responseDto,
    });
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get query log by ID',
    description: 'Retrieve detailed query log with all process steps',
  })
  @ApiParam({
    name: 'id',
    description: 'Query log ID',
    example: 'cm0abc123def456',
  })
  async getQueryLogById(
    @Param('id') id: string,
  ): Promise<SuccessResponseDto<QueryLogDetailResponseDto>> {
    const { log, steps } = await this.getQueryLogByIdUseCase.execute({ id });

    const responseDto = QueryLogResponseMapper.toDetailDto(log, steps);

    return new SuccessResponseDto<QueryLogDetailResponseDto>({
      message: 'Query log retrieved successfully',
      data: responseDto,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete query log by ID',
    description: 'Permanently delete a query log and its associated steps',
  })
  @ApiParam({
    name: 'id',
    description: 'Query log ID',
    example: 'cm0abc123def456',
  })
  async deleteQueryLogById(
    @Param('id') id: string,
  ): Promise<SuccessResponseDto<null>> {
    await this.deleteQueryLogByIdUseCase.execute({ id });

    return new SuccessResponseDto<null>({
      message: 'Query log deleted successfully',
      data: null,
    });
  }
}
