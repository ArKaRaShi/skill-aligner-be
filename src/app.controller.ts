import { Controller, Get, Query } from '@nestjs/common';
import { AppConfigService } from './config/app-config.service';
import { Experimental_Agent as Agent, stepCountIs, tool } from 'ai';
import {
  createOpenRouter,
  OpenRouterProvider,
} from '@openrouter/ai-sdk-provider';

import { z } from 'zod';

export const weatherTool = tool({
  description: 'Get the weather in a location',
  inputSchema: z.object({
    location: z.string().describe('The location to get the weather for'),
  }),
  outputSchema: z.object({
    location: z.string().describe('The location the weather is for'),
    temperatureCelsius: z.number().describe('The temperature in Celsius'),
    temperatureFahrenheit: z.number().describe('The temperature in Fahrenheit'),
    condition: z
      .string()
      .describe('The weather condition (e.g., sunny, rainy)'),
  }),
  // eslint-disable-next-line @typescript-eslint/require-await
  execute: async ({ location }) => {
    const getRandomWeather = () => {
      const temperaturesCelsius = [20, 22, 25, 27, 30];
      const conditions = ['sunny', 'cloudy', 'rainy', 'windy', 'stormy'];
      const randomTemp =
        temperaturesCelsius[
          Math.floor(Math.random() * temperaturesCelsius.length)
        ];
      const randomCondition =
        conditions[Math.floor(Math.random() * conditions.length)];
      return { temperature: randomTemp, condition: randomCondition };
    };

    const weather = getRandomWeather();
    console.log(
      `Fetched weather for ${location}:`,
      JSON.stringify(weather, null, 2),
    );
    return {
      location,
      temperatureCelsius: weather.temperature,
      temperatureFahrenheit: (weather.temperature * 9) / 5 + 32,
      condition: weather.condition,
    };
  },
});

@Controller()
export class AppController {
  private readonly openRouter: OpenRouterProvider;

  constructor(private readonly appConfigService: AppConfigService) {
    this.openRouter = createOpenRouter({
      apiKey: this.appConfigService.openRouterApiKey,
      baseURL: 'https://openrouter.ai/api/v1',
    });
  }

  @Get('/openrouter')
  async getResponse(@Query('question') question: string): Promise<string> {
    const completions = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.appConfigService.openRouterApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-20b:free',
          messages: [
            {
              role: 'user',
              content: question,
            },
          ],
        }),
      },
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await completions.json();
  }

  @Get('/openai')
  async getOpenAiResponse(
    @Query('question') question: string,
  ): Promise<string> {
    const agent = new Agent({
      model: this.openRouter('x-ai/grok-4-fast:free'),
      system: `
  ## Role
  You are a weather information assistant. You respond with clear, human-friendly
  summaries based strictly on the structured data returned by the \`weather\` tool.

  ## Instruction
  1. Always call the \`weather\` tool when asked about weather.
  2. Use only the tool’s output fields: \`location\`, \`temperatureCelsius\`, 
     \`temperatureFahrenheit\`, and \`condition\`.
  3. Format the final answer as: 
     "The current weather in [location] is [temperatureCelsius]°C ([temperatureFahrenheit]°F) and [condition]."
  4. Never invent values. If the tool fails, respond with: 
     "Weather information for [location] is currently unavailable."

  ## Context
  - Tool always returns numeric Celsius and Fahrenheit values, plus a text condition.
  - Audience expects a short, readable summary, not raw JSON.
  - Keep answers one sentence long.

  ## Example
  **Input:** "What is the weather in Bangkok?"  
  **Output:** "The current weather in Bangkok, Thailand is 27°C (80.6°F) and cloudy."
  `,
      tools: {
        weather: weatherTool,
      },
      stopWhen: stepCountIs(3),
    });

    const result = await agent.generate({
      prompt: question,
    });

    const { text, steps } = result;
    console.log('Steps:', JSON.stringify(steps, null, 2));
    return text;
  }
}
