/**
 * Validation schemas using Zod for runtime type checking
 */

import { z } from 'zod';
import type { ValidAnalyzeProjectInput, ValidSearchFileContentInput } from '../types';

// Configuration validation schemas - discriminated unions
const BaseDocumenterConfigSchema = z.object({
  max_conversation_history: z.number().int().min(1).max(100).optional(),
  default_output_dir: z.string().optional(),
  timeout: z.number().int().min(1000).optional(),
});

const OpenAIDocumenterConfigSchema = BaseDocumenterConfigSchema.extend({
  provider: z.literal('openai'),
  openai_api_key: z.string().optional(),
  openai_model: z.string().optional(),
});

const LMStudioDocumenterConfigSchema = BaseDocumenterConfigSchema.extend({
  provider: z.literal('lmstudio'),
  lmstudio_endpoint: z.string().url().optional(),
  lmstudio_model: z.string().optional(),
});

const UndefinedProviderDocumenterConfigSchema = BaseDocumenterConfigSchema.extend({
  provider: z.undefined().optional(),
});

export const DocumenterConfigSchema = z.union([
  OpenAIDocumenterConfigSchema,
  LMStudioDocumenterConfigSchema,
  UndefinedProviderDocumenterConfigSchema,
]);

const OpenAIProviderConfigSchema = z.object({
  provider: z.literal('openai'),
  openai_api_key: z.string().optional(),
  openai_model: z.string().optional(),
  timeout: z.number().int().min(1000).optional(),
});

const LMStudioProviderConfigSchema = z.object({
  provider: z.literal('lmstudio'),
  lmstudio_endpoint: z.string().url().optional(),
  lmstudio_model: z.string().optional(),
  timeout: z.number().int().min(1000).optional(),
});

export const ProviderConfigSchema = z.discriminatedUnion('provider', [
  OpenAIProviderConfigSchema,
  LMStudioProviderConfigSchema,
]);

// Tool input validation schemas
export const ReadFileInputSchema = z.object({
  file_path: z.string().min(1, 'File path cannot be empty'),
});

export const ListDirectoryInputSchema = z.object({
  directory_path: z.string().min(1, 'Directory path cannot be empty'),
  include_hidden: z.boolean(),
});

export const GetFileInfoInputSchema = z.object({
  file_path: z.string().min(1, 'File path cannot be empty'),
});

export const WriteFileInputSchema = z.object({
  file_path: z.string().min(1, 'File path cannot be empty'),
  content: z.string(),
  overwrite: z.boolean(),
});

// Enhanced search validation schemas
const SearchFilesInputBaseSchema = z.object({
  directory_path: z.string().min(1, 'Directory path cannot be empty'),
  pattern: z.string().min(1, 'Pattern cannot be empty'),
  file_extensions: z.array(z.string()).optional(),
  max_results: z.number().int().min(1).max(500),
  case_sensitive: z.boolean(),
  fuzzy_search: z.boolean(),
  min_score: z.number().min(0).max(1),
  include_directories: z.boolean(),
});

export const SearchFilesInputSchema = z.preprocess(input => {
  if (typeof input === 'object' && input !== null) {
    return {
      max_results: 50,
      case_sensitive: false,
      fuzzy_search: false,
      min_score: 0.3,
      include_directories: false,
      ...input,
    };
  }
  return input;
}, SearchFilesInputBaseSchema) as z.ZodType<z.infer<typeof SearchFilesInputBaseSchema>>;

const FuzzySearchOptionsBaseSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty'),
  directory_path: z.string().min(1, 'Directory path cannot be empty'),
  file_extensions: z.array(z.string()).optional(),
  max_results: z.number().int().min(1).max(500),
  case_sensitive: z.boolean(),
  search_content: z.boolean(),
  min_score: z.number().min(0).max(1),
  include_directories: z.boolean(),
});

export const FuzzySearchOptionsSchema = z.preprocess(input => {
  if (typeof input === 'object' && input !== null) {
    return {
      max_results: 50,
      case_sensitive: false,
      search_content: false,
      min_score: 0.3,
      include_directories: false,
      ...input,
    };
  }
  return input;
}, FuzzySearchOptionsBaseSchema) as z.ZodType<z.infer<typeof FuzzySearchOptionsBaseSchema>>;

// Chat message validation
export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
});

// Utility functions for validation
export function validateToolInput<T>(schema: z.ZodSchema<T>, input: string, toolName: string): T {
  try {
    const parsed = JSON.parse(input);
    return schema.parse(parsed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map(issue => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      throw new Error(`Invalid input for tool ${toolName}: ${issues}`);
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON input for tool ${toolName}: ${error.message}`);
    }
    throw error;
  }
}

export function validateConfig<T>(schema: z.ZodSchema<T>, config: unknown, configType: string): T {
  try {
    return schema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map(issue => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      throw new Error(`Invalid ${configType} configuration: ${issues}`);
    }
    throw error;
  }
}

export function validateSearchFilesInput(input: string): ValidSearchFilesInput {
  return validateToolInput(SearchFilesInputSchema, input, 'search_files');
}

export function validateAnalyzeProjectInput(input: string): ValidAnalyzeProjectInput {
  try {
    const parsed = JSON.parse(input);
    if (!parsed.project_path || typeof parsed.project_path !== 'string') {
      throw new Error('project_path is required and must be a string');
    }
    return {
      project_path: parsed.project_path,
      max_depth: parsed.max_depth || 5,
    };
  } catch (error) {
    throw new Error(
      `Invalid analyze_project input: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export function validateSearchFileContentInput(input: string): ValidSearchFileContentInput {
  try {
    const parsed = JSON.parse(input);
    if (!parsed.directory_path || typeof parsed.directory_path !== 'string') {
      throw new Error('directory_path is required and must be a string');
    }
    if (!parsed.search_term || typeof parsed.search_term !== 'string') {
      throw new Error('search_term is required and must be a string');
    }
    return {
      directory_path: parsed.directory_path,
      search_term: parsed.search_term,
      file_extensions: parsed.file_extensions || undefined,
      max_results: parsed.max_results || 20,
      case_sensitive: parsed.case_sensitive || false,
    };
  } catch (error) {
    throw new Error(
      `Invalid search_file_content input: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Type exports for use with validation - these are the source of truth
export type ValidDocumenterConfig = z.infer<typeof DocumenterConfigSchema>;
export type ValidProviderConfig = z.infer<typeof ProviderConfigSchema>;
export type ValidReadFileInput = z.infer<typeof ReadFileInputSchema>;
export type ValidListDirectoryInput = z.infer<typeof ListDirectoryInputSchema>;
export type ValidGetFileInfoInput = z.infer<typeof GetFileInfoInputSchema>;
export type ValidWriteFileInput = z.infer<typeof WriteFileInputSchema>;
export type ValidSearchFilesInput = z.infer<typeof SearchFilesInputSchema>;
export type ValidFuzzySearchOptions = z.infer<typeof FuzzySearchOptionsSchema>;
export type ValidChatMessage = z.infer<typeof ChatMessageSchema>;
