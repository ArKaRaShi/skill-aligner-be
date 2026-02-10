import axios, { AxiosInstance, CreateAxiosDefaults } from 'axios';

let semanticsHttpClient: AxiosInstance | null = null;

export const initSemanticsHttpClient = (
  config: CreateAxiosDefaults = {},
): AxiosInstance => {
  if (!semanticsHttpClient) {
    semanticsHttpClient = axios.create({
      timeout: 15_000,
      headers: { 'Content-Type': 'application/json' },
      ...config,
    });
  }

  return semanticsHttpClient;
};

export const getSemanticsHttpClient = (): AxiosInstance => {
  if (!semanticsHttpClient) {
    throw new Error(
      'Semantics HTTP client is not initialized. Call initSemanticsHttpClient first.',
    );
  }

  return semanticsHttpClient;
};
