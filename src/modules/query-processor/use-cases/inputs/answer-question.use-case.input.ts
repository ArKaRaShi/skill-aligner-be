import { Identifier } from 'src/common/domain/types/identifier';
import { AcademicYearSemesterFilter } from 'src/common/types/academic-year-semester-filter.type';

export class AnswerQuestionUseCaseInput {
  public readonly question: string;
  public readonly campusId?: Identifier;
  public readonly facultyId?: Identifier;
  public readonly genEdOnly?: boolean;
  public readonly academicYearSemesters?: AcademicYearSemesterFilter[];

  constructor(params: {
    question: string;
    campusId?: Identifier;
    facultyId?: Identifier;
    genEdOnly?: boolean;
    academicYearSemesters?: AcademicYearSemesterFilter[];
  }) {
    this.question = params.question;
    this.campusId = params.campusId;
    this.facultyId = params.facultyId;
    this.genEdOnly = params.genEdOnly ?? false;
    this.academicYearSemesters = params.academicYearSemesters;
  }
}
