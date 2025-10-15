import {
  Occupation,
  OccupationKnowledgeRelation,
  OccupationSkillRelation,
} from 'src/pipelines-v2/shared/types/occupation.type';

export class OccupationRelationBuilder {
  /**
   * Builds the skill relations for a given list of occupations.
   * @param occupations - The list of occupations to build relations for.
   * @returns The list of occupation-skill relations.
   */
  static buildSkillRelations(
    occupations: Occupation[],
  ): OccupationSkillRelation[] {
    const relations: OccupationSkillRelation[] = [];
    occupations.forEach((occupation) => {
      occupation.skills.forEach((skill) => {
        relations.push({
          occupationSlugId: occupation.slugId,
          skillSlugId: skill.slugId,
        });
      });
    });
    return relations;
  }

  /**
   * Builds the knowledge relations for a given list of occupations.
   * @param occupations - The list of occupations to build relations for.
   * @returns The list of occupation-knowledge relations.
   */
  static buildKnowledgeRelations(
    occupations: Occupation[],
  ): OccupationKnowledgeRelation[] {
    const relations: OccupationKnowledgeRelation[] = [];
    occupations.forEach((occupation) => {
      occupation.knowledge.forEach((knowledge) => {
        relations.push({
          occupationSlugId: occupation.slugId,
          knowledgeSlugId: knowledge.slugId,
        });
      });
    });
    return relations;
  }

  /**
   * Builds both skill and knowledge relations for a given list of occupations.
   * @param occupations - The list of occupations to build relations for.
   * @returns An object containing both skill and knowledge relations.
   */
  static buildAllRelations(occupations: Occupation[]): {
    skillRelations: OccupationSkillRelation[];
    knowledgeRelations: OccupationKnowledgeRelation[];
  } {
    return {
      skillRelations: this.buildSkillRelations(occupations),
      knowledgeRelations: this.buildKnowledgeRelations(occupations),
    };
  }
}
