import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { Logger } from '../../../../services/utils/Logger';
import { ApiResponse } from '../shared/types';
import { ValidationError, createCheckpointContext } from '../shared/validation';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );

    // Validate request and create context
    const context = await createCheckpointContext(req, supabaseClient);
    
    // Get the second revision outline
    const { data: outlineData, error: outlineError } = await supabaseClient
      .from('novels')
      .select('outline_data, outline_status')
      .eq('id', context.novelId)
      .single();

    if (outlineError || !outlineData?.outline_data?.current) {
      throw new Error('Failed to fetch outline data');
    }

    // Verify we're in the correct state
    if (outlineData.outline_status !== 'pass2') {
      throw new Error('Cannot finalize outline: incorrect status');
    }

    // Extract total chapters from outline
    const chapterMatches = outlineData.outline_data.current.match(/Chapter\s+\d+/gi);
    if (!chapterMatches) {
      throw new Error('No chapters found in outline');
    }
    const totalChapters = chapterMatches.length;

    if (totalChapters < 10 || totalChapters > 150) {
      throw new Error(`Invalid chapter count: ${totalChapters}`);
    }

    // Update novel status to completed outline
    const { error: updateError } = await supabaseClient
      .from('novels')
      .update({
        outline_status: 'completed',
        outline_version: 3,
        total_chapters: totalChapters,
        current_chapter: 0,
        novel_status: 'outline_completed'
      })
      .eq('id', context.novelId);

    if (updateError) {
      throw updateError;
    }

    Logger.info(`Outline finalized for novel ${context.novelId} with ${totalChapters} chapters`);
    return res.status(200).json({
      success: true,
      novelId: context.novelId
    });

  } catch (error) {
    Logger.error('Error in outline finalization:', error);
    
    const statusCode = error instanceof ValidationError ? 400 : 500;
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    
    return res.status(statusCode).json({
      success: false,
      error: message,
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
} 