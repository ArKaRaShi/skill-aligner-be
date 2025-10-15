import { SourceMetadata } from 'src/pipelines/shared/types';

export type Skill = {
  id: string; // uuid
  slugId: string; // such as 'skill-1234' from ESCO
  occupationId: string[];
  nameEn: string;
  descriptionEn: string;
  sourceMetadata: SourceMetadata;
};
