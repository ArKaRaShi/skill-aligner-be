import { SourceMetadata } from 'src/pipelines/shared/types';

import { Knowledge } from './knowledge.type';
import { Skill } from './skill.type';

export type Occupation = {
  id: string;
  slugId: string; // such as 'occupation-1234' from ESCO
  name: string;
  description: string;
  skills: Skill[];
  knowledge: Knowledge[];
  sourceMetadata: SourceMetadata;
};

export type OccupationSkillRelation = {
  occupationSlugId: string;
  skillSlugId: string;
};

export type OccupationKnowledgeRelation = {
  occupationSlugId: string;
  knowledgeSlugId: string;
};
