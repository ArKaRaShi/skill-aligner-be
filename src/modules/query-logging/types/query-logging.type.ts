import { Identifier } from 'src/shared/domain/value-objects/identifier';

export type QueryStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export type QueryProcessLog = {
  id: Identifier;
  question: string;
  status: QueryStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type QueryProcessStep = {
  id: Identifier;
  queryLogId: Identifier;
  stepName: string;
  stepOrder: number;
  startedAt: Date;
  completedAt: Date | null;
  duration: number | null;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

export type QueryProcessLogWithSteps = QueryProcessLog & {
  processSteps: QueryProcessStep[];
};
