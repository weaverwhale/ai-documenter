import OpenAI from 'openai';
import type { LLMProvider, ProviderConfig } from '../types';
import { ConfigurationError, ProviderError } from '../classes/errors';

// OpenAI provider
export const createOpenAIProvider = (config: ProviderConfig): LLMProvider => {
  if (!config.openai_api_key) {
    throw new ConfigurationError('OpenAI API key is required', { provider: 'openai' });
  }

  try {
    const client = new OpenAI({
      apiKey: config.openai_api_key,
      timeout: config.timeout || 3600 * 1000, // 1 hour timeout for deep research operations
    });

    return {
      name: 'OpenAI',
      client,
      defaultModel: config.openai_model || 'gpt-4o-mini',
    };
  } catch (error) {
    throw new ProviderError(
      `Failed to create OpenAI provider: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'openai',
      { originalError: error }
    );
  }
};

// LMStudio provider
export const createLMStudioProvider = (config: ProviderConfig): LLMProvider => {
  const endpoint = config.lmstudio_endpoint || 'http://localhost:1234/v1';

  try {
    // Validate endpoint format
    new URL(endpoint);
  } catch {
    throw new ConfigurationError(`Invalid LMStudio endpoint URL: ${endpoint}`, {
      provider: 'lmstudio',
      endpoint,
    });
  }

  try {
    // LMStudio uses OpenAI-compatible API, so we can use the OpenAI client
    // but point it to the local endpoint with a dummy API key
    const client = new OpenAI({
      apiKey: 'lm-studio', // LMStudio doesn't require a real API key
      baseURL: endpoint,
      timeout: config.timeout || 3600 * 1000,
    });

    return {
      name: 'LMStudio',
      client,
      defaultModel: config.lmstudio_model || 'local-model',
    };
  } catch (error) {
    throw new ProviderError(
      `Failed to create LMStudio provider: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'lmstudio',
      { originalError: error, endpoint }
    );
  }
};

// Provider factory
export const createProvider = (config: ProviderConfig): LLMProvider => {
  switch (config.provider) {
    case 'openai':
      return createOpenAIProvider(config);
    case 'lmstudio':
      return createLMStudioProvider(config);
    default:
      throw new ConfigurationError(`Unsupported provider: ${config.provider}`, {
        provider: config.provider,
        supportedProviders: ['openai', 'lmstudio'],
      });
  }
};
