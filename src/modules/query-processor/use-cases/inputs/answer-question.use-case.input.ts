import { AcademicYearSemesterFilter } from 'src/shared/contracts/types/academic-year-semester-filter.type';
import { Identifier } from 'src/shared/contracts/types/identifier';

export class AnswerQuestionUseCaseInput {
  public readonly question: string;
  public readonly campusId?: Identifier;
  public readonly facultyId?: Identifier;
  public readonly isGenEd?: boolean;
  public readonly academicYearSemesters?: AcademicYearSemesterFilter[];

  constructor(params: {
    question: string;
    campusId?: Identifier;
    facultyId?: Identifier;
    isGenEd?: boolean;
    academicYearSemesters?: AcademicYearSemesterFilter[];
  }) {
    this.question = params.question;
    this.campusId = params.campusId;
    this.facultyId = params.facultyId;
    this.isGenEd = params.isGenEd || undefined;
    this.academicYearSemesters = params.academicYearSemesters;
  }
}
