import { GetQueryLogByIdUseCase } from './get-query-log-by-id.use-case';
import { ListQueryLogsUseCase } from './list-query-logs.use-case';

export const QueryLoggingUseCases = [
  ListQueryLogsUseCase,
  GetQueryLogByIdUseCase,
];
