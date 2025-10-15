const BasePath = {
  OCCUPATION_PREPROCESSING: 'src/pipelines-v2/preprocessing/occupation-side',
};

export const OccupationPath = {
  FETCH: `${BasePath.OCCUPATION_PREPROCESSING}/data/fetch/occupations`,
  RELATION_SKILLS: `${BasePath.OCCUPATION_PREPROCESSING}/data/relations/occupation-skill-relations`,
  RELATION_KNOWLEDGE: `${BasePath.OCCUPATION_PREPROCESSING}/data/relations/occupation-knowledge-relations`,
};
