type SlugPrefix = 'occupation' | 'skill' | 'knowledge';

export class SlugHelper {
  /**
   * Generates a slug from a given text
   * @param text - The input text to generate a slug from
   * @returns The generated slug
   */
  static generateSlug(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFKD') // Normalize special characters
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^a-z0-9]+/g, '_') // Replace non-alphanumeric with underscore
      .replace(/(^_+|_+$)/g, '') // Remove leading/trailing underscores
      .replace(/_+/g, '_'); // Replace multiple underscores with single
  }

  /**
   * Creates a unique ID by combining a prefix and a slugified name
   * @param prefix - The prefix to use (e.g., 'occupation', 'skill', 'knowledge')
   * @param name - The name to generate the slug from
   * @returns The generated unique ID
   */
  static createId(prefix: SlugPrefix, name: string): string {
    const slug = this.generateSlug(name);
    return `${prefix}_${slug}`;
  }

  /**
   * Creates a relation object between an occupation and a skill
   * @param occupationId - The ID of the occupation
   * @param skillId - The ID of the skill
   * @returns An object representing the relation
   */
  static createRelation(
    occupationId: string,
    skillId: string,
  ): { occupationId: string; skillId: string } {
    return { occupationId, skillId };
  }
}
