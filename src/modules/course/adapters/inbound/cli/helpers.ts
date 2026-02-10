/**
 * CLI Helper Functions
 *
 * Pure, testable functions for the analyze-query CLI.
 * These functions are isolated from side effects like console.log and process.exit.
 */

/**
 * CLI arguments interface
 */
export interface CliArgs {
  query?: string;
  threshold?: number;
  topN?: number;
  campusId?: string;
  facultyId?: string;
  isGenEd?: boolean;
  help: boolean;
}

/**
 * Parse command line arguments from an array
 *
 * @param args - Array of command line arguments (e.g., process.argv.slice(2))
 * @returns Parsed CLI arguments
 */
export function parseArgsArray(args: string[]): CliArgs {
  const result: CliArgs = {
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--help' || args[i] === '-h') {
      result.help = true;
      return result;
    }

    if (args[i] === '--query') {
      if (args[i + 1] && !args[i + 1].startsWith('--')) {
        result.query = args[i + 1];
        i++;
      }
      // Don't return early - continue processing other flags like --top-n
    }

    if (args[i] === '--threshold') {
      if (args[i + 1] && !args[i + 1].startsWith('--')) {
        result.threshold = Number.parseFloat(args[i + 1]);
        i++;
      }
    }

    if (args[i] === '--top-n') {
      if (args[i + 1] && !args[i + 1].startsWith('--')) {
        result.topN = Number.parseInt(args[i + 1], 10);
        i++;
      }
    }

    if (args[i] === '--campus-id') {
      if (args[i + 1] && !args[i + 1].startsWith('--')) {
        result.campusId = args[i + 1];
        i++;
      }
    }

    if (args[i] === '--faculty-id') {
      if (args[i + 1] && !args[i + 1].startsWith('--')) {
        result.facultyId = args[i + 1];
        i++;
      }
    }

    if (args[i] === '--is-gen-ed') {
      result.isGenEd = args[i + 1] === 'true';
      i++;
    }
  }

  return result;
}

/**
 * Get similarity bar visualization
 *
 * @param score - Similarity score (0-100)
 * @returns Formatted string with percentage and visual bar
 *
 * @example
 * getSimilarityBar(85) // "85.0% ███████████████████"
 * getSimilarityBar(0)   // "0.0% "
 * getSimilarityBar(100) // "100.0% ██████████████████████████"
 */
export function getSimilarityBar(score: number): string {
  const blocks = Math.floor(score / 10);
  const bar = '█'.repeat(Math.max(0, blocks));
  return `${score.toFixed(1)}% ${bar}`;
}

/**
 * CLI display constants
 */
export const CLI_DISPLAY_CONSTANTS = {
  RANK_COL_WIDTH: 6,
  COURSE_COL_WIDTH: 26,
  CAMPUS_FACULTY_COL_WIDTH: 23,
  CODE_COL_WIDTH: 10,
  SIMILARITY_COL_WIDTH: 15,
  MATCHED_COL_WIDTH: 10,
  TOTAL_COL_WIDTH: 8,
  MAX_COURSE_NAME_LENGTH: 24,
  MAX_CAMPUS_FACULTY_LENGTH: 22,
  TRUNCATED_COURSE_NAME_LENGTH: 21,
  TRUNCATED_CAMPUS_FACULTY_LENGTH: 19,
} as const;
