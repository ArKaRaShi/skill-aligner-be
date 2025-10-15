import { SourceMetadata } from 'src/pipelines/shared/types';

export type Knowledge = {
  id: string;
  slugId: string; // such as 'knowledge-1234' from ESCO
  occupationId: string[];
  name: string;
  description: string;
  sourceMetadata: SourceMetadata;
};
