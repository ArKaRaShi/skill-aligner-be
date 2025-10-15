import { OccupationPath } from 'src/pipelines-v2/shared/constants/dir-path.constant';
import { FileHelper } from 'src/pipelines-v2/shared/helpers/file.helper';
import {
  Occupation,
  OccupationKnowledgeRelation,
  OccupationSkillRelation,
} from 'src/pipelines-v2/shared/types/occupation.type';
import { IPipeline } from 'src/pipelines/i-pipeline.contract';

import { EscoOccupationFetchPipeline } from './occupation/esco-occupation-fetch.pipeline';
import { OccupationRelationBuilder } from './shared/occupation-relation.builder';

function getOccupationPreprocessingPipeline(): IPipeline<
  string[],
  Occupation[]
> {
  return new EscoOccupationFetchPipeline();
}

// main.execute
const uris = [
  // Example ESCO occupation URIs
  // software developer
  // 'http://data.europa.eu/esco/occupation/f2b15a0e-e65a-438a-affb-29b9d50b77d1',
  // software architect
  // 'http://data.europa.eu/esco/occupation/d0aa0792-4345-474b-9365-686cf4869d2e',
  // data scientist
  // 'http://data.europa.eu/esco/occupation/258e46f9-0075-4a2e-adae-1ff0477e0f30',
  // data engineer (can't find in ESCO)
  // 'http://data.europa.eu/esco/occupation/2079755f-d809-49e6-8037-4de6180e54c0',
  // web developer
  'http://data.europa.eu/esco/occupation/c40a2919-48a9-40ea-b506-1f34f693496d',
];

// Execute fetch pipeline and save results
getOccupationPreprocessingPipeline()
  .execute(uris)
  .then((occupations) => {
    console.log(`Fetched ${occupations.length} occupations`);
    FileHelper.appendToLatestJson(OccupationPath.FETCH, occupations);
    const latestOccupations = FileHelper.readLatestJson<Occupation[]>(
      OccupationPath.FETCH,
    );
    console.log(`Fresh read ${latestOccupations.length} occupations`);
    const { skillRelations, knowledgeRelations } =
      OccupationRelationBuilder.buildAllRelations(latestOccupations);
    FileHelper.overwriteLatestJson<OccupationSkillRelation[]>(
      OccupationPath.RELATION_SKILLS,
      skillRelations,
    );
    FileHelper.overwriteLatestJson<OccupationKnowledgeRelation[]>(
      OccupationPath.RELATION_KNOWLEDGE,
      knowledgeRelations,
    );
    console.log(
      `Built and saved ${skillRelations.length} and ${knowledgeRelations.length} relations`,
    );
  })
  .catch((error) => {
    console.error('Error fetching occupations:', error);
  });

// bunx ts-node --require tsconfig-paths/register src/pipelines-v2/preprocessing/occupation-side/index.ts
