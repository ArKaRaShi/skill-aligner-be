export interface IPipeline<Input, Output> {
  execute(input: Input): Promise<Output>;
}
