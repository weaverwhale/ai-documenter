import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;
export const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

if (!apiKey) {
  console.error(
    'Error: OPENAI_API_KEY environment variable is missing. Please add it to your .env file.',
  );
  process.exit(1);
}

export const client = new OpenAI({
  apiKey,
  timeout: 3600 * 1000, // 1 hour timeout for deep research operations
});
