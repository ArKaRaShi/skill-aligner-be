/**
 * A generic interface for a use case in the application.
 */
export interface IUseCase<Input, Output> {
  /**
   * Executes the use case with the given input.
   * @param input - The input data required to execute the use case.
   * @returns A promise that resolves to the output data after executing the use case.
   */
  execute(input: Input): Promise<Output>;
}
