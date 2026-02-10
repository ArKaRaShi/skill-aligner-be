import { AcademicYearSemesterFilter } from 'src/shared/contracts/types/academic-year-semester-filter.type';
import { Identifier } from 'src/shared/contracts/types/identifier';

/**
 * Input for streaming answer question use case.
 * Contains all base fields plus streaming mode flag.
 */
export class AnswerQuestionStreamUseCaseInput {
  public readonly question: string;
  public readonly campusId?: Identifier;
  public readonly facultyId?: Identifier;
  public readonly isGenEd?: boolean;
  public readonly academicYearSemesters?: AcademicYearSemesterFilter[];
  public readonly stream: boolean;

  constructor(params: {
    question: string;
    campusId?: Identifier;
    facultyId?: Identifier;
    isGenEd?: boolean;
    academicYearSemesters?: AcademicYearSemesterFilter[];
    stream?: boolean;
  }) {
    this.question = params.question;
    this.campusId = params.campusId;
    this.facultyId = params.facultyId;
    this.isGenEd = params.isGenEd || undefined;
    this.academicYearSemesters = params.academicYearSemesters;
    this.stream = params.stream ?? true; // Default to true (streaming mode)
  }
}
