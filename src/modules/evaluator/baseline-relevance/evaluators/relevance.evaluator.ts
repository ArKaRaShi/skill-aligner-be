// import { Inject, Injectable } from '@nestjs/common';

// import {
//   I_LLM_ROUTER_SERVICE_TOKEN,
//   ILlmRouterService,
// } from 'src/shared/adapters/llm/contracts/i-llm-router-service.contract';

// import { IBatchEvaluator } from '../../shared/contracts/i-evaluator.contract';
// import { RelevanceInput, RelevanceOutput } from './type';

// @Injectable()
// export class LlmRelevanceEvaluator
//   implements IBatchEvaluator<RelevanceInput, RelevanceOutput>
// {
//   constructor(
//     @Inject(I_LLM_ROUTER_SERVICE_TOKEN)
//     private readonly llmRouterService: ILlmRouterService,

//     private readonly,
//   ) {}

//   async batchEvaluate(inputs: RelevanceInput[]): Promise<RelevanceOutput[]> {
//     // 1. Validation: Check batch size
//     if (inputs.length === 0) return [];
//     if (inputs.length > 10) throw new Error('Batch size too large (max 10)');

//     // 2. Construct the Prompt
//     const prompt = this.buildPrompt(inputs);

//     // 3. Call LLM
//     const llmResponse = await this.llmService.generate(prompt);

//     // 4. Parse JSON
//     // (Assuming your LLM returns the expected JSON structure)
//     const parsed = JSON.parse(llmResponse);

//     return parsed.results;
//   }

//   private buildPrompt(inputs: RelevanceInput[]): string {
//     // Simplify input for the LLM to save tokens
//     const simplifiedInputs = inputs.map((i) => ({
//       id: i.id,
//       question: i.userQuestion,
//       course: `${i.recommendedCourse.code} ${i.recommendedCourse.title}: ${i.recommendedCourse.description}`,
//     }));

//     return `
// You are an impartial search quality evaluator.
// Evaluate the relevance of the following Course Recommendations to the User Questions.

// Scoring Scale:
// 3: Highly Relevant (Directly solves the problem).
// 2: Somewhat Relevant (Helpful context).
// 1: Tangential (Not helpful).
// 0: Irrelevant.

// Input Data:
// ${JSON.stringify(simplifiedInputs, null, 2)}

// Output JSON Format:
// { "results": [ { "id": <id>, "score": <0-3>, "reason": "<short text>" } ] }
// `;
//   }
// }
