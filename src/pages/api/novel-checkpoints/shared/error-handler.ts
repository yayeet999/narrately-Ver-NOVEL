import { NextApiResponse } from 'next';
import { Logger } from '../../../../services/utils/Logger';
import { AuthError } from './auth';
import { ValidationError } from './validation';
import { SupabaseClient } from '@supabase/supabase-js';
import { NovelStatus } from './types';

export interface ErrorResponse {
  success: false;
  error: string;
  details?: string;
}

export async function handleApiError(
  error: unknown,
  res: NextApiResponse<ErrorResponse>,
  supabaseClient?: SupabaseClient,
  novelId?: string
): Promise<void> {
  Logger.error('API Error:', error);

  let statusCode = 500;
  let errorMessage = 'An unknown error occurred';
  let errorDetails: string | undefined;

  if (error instanceof AuthError) {
    statusCode = 401;
    errorMessage = error.message;
  } else if (error instanceof ValidationError) {
    statusCode = 400;
    errorMessage = error.message;
  } else if (error instanceof Error) {
    errorMessage = error.message;
    if (error.stack) {
      errorDetails = process.env.NODE_ENV === 'development' ? error.stack : undefined;
    }
  }

  // Update novel error state if possible
  if (supabaseClient && novelId) {
    try {
      await supabaseClient
        .from('novels')
        .update({
          novel_status: NovelStatus.Error,
          error: errorMessage,
          updated_at: new Date().toISOString()
        })
        .eq('id', novelId);
    } catch (updateError) {
      Logger.error('Failed to update novel error state:', updateError);
    }
  }

  // Handle specific error types
  if (error instanceof Error) {
    if (error.message.includes('timeout') || error.message.includes('504')) {
      statusCode = 504;
      errorMessage = 'Request timed out - please try again';
    } else if (error.message.includes('rate limit') || error.message.includes('429')) {
      statusCode = 429;
      errorMessage = 'Rate limit exceeded - please try again later';
    }
  }

  res.status(statusCode).json({
    success: false,
    error: errorMessage,
    details: errorDetails
  });
} 