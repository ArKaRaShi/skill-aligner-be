/**
 * Mapping from backend SSE step names to Thai display names
 *
 * Backend sends these 6 steps via SSE:
 * 1. classification
 * 2. skill_expansion
 * 3. course_retrieval
 * 4. relevance_filter
 * 5. aggregation
 * 6. answer_synthesis
 */
export class StepNameHelper {
  private static readonly STEP_NAME_MAP: Record<string, string> = {
    // Step 1: Classification
    classification: 'กำลังคัดกรอง',

    // Step 2: Skill expansion
    skill_expansion: 'กำลังขยายทักษะ',

    // Step 3: Course retrieval
    course_retrieval: 'กำลังดึงข้อมูลรายวิชา',

    // Step 4: Relevance filter
    relevance_filter: 'กำลังกรองความเกี่ยวข้อง',

    // Step 5: Aggregation
    aggregation: 'กำลังรวบรวมข้อมูล',

    // Step 6: Answer synthesis
    answer_synthesis: 'กำลังสร้างคำตอบ',
  } as const;

  /**
   * Get Thai display name for a backend step name
   * @param stepName - The backend step name (e.g., 'classification', 'skill_expansion')
   * @returns The Thai display name, or the original step name if not found
   */
  static getDisplayName(stepName: string): string {
    return this.STEP_NAME_MAP[stepName] || stepName;
  }
}
