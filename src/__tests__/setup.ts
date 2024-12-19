import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'OPENAI_API_KEY'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Initialize test database
beforeAll(async () => {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );

  // Clean up any test data from previous runs
  const { error } = await supabase
    .from('novels')
    .delete()
    .eq('user_id', 'test-user');

  if (error) {
    console.warn('Error cleaning up test data:', error);
  }
});

// Global test configuration
jest.setTimeout(30000); // 30 seconds

// Mock fetch for API calls
global.fetch = jest.fn();

// Helper to create mock responses
export const createMockResponse = (status: number, data: any) => {
  return Promise.resolve({
    status,
    json: () => Promise.resolve(data),
    ok: status >= 200 && status < 300
  });
}; 