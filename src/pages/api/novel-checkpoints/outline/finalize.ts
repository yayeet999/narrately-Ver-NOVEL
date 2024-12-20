import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../../integrations/supabase/client';
import { Logger } from '../../../../services/utils/Logger';
import { ApiResponse } from '../shared/types';
import { ValidationError, createCheckpointContext } from '../shared/validation';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    const context = await createCheckpointContext(req);
    const { novelId } = context;
    
    // Get the second revision
    const { data: novelData, error: outlineError } = await supabase
      .from('novels')
      .select('outline_data, outline_status')
      .eq('id', novelId)
      .single();

    if (outlineError || !novelData?.outline_data?.current) {
      throw new Error('Failed to fetch outline data');
    }

    // Verify we're in the correct state
    if (novelData.outline_status !== 'pass2') {
      throw new Error('Invalid outline status for finalization');
    }

    // Store final outline with updated status
    const { error: updateError } = await supabase
      .from('novels')
      .update({
        outline_status: 'completed',
        novel_status: 'outline_completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', novelId);

    if (updateError) {
      throw updateError;
    }

    Logger.info(`Outline finalized for novel ${novelId}`);
    return res.status(200).json({
      success: true,
      novelId: novelId
    });

  } catch (error) {
    Logger.error('Error in outline finalization:', error);
    const statusCode = error instanceof ValidationError ? 400 : 500;
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    
    // Update novel status to error if finalization fails
    try {
      const context = await createCheckpointContext(req);
      await supabase
        .from('novels')
        .update({
          novel_status: 'error',
          error: message,
          updated_at: new Date().toISOString()
        })
        .eq('id', context.novelId);
    } catch (updateError) {
      Logger.error('Failed to update error status:', updateError);
    }
    
    return res.status(statusCode).json({
      success: false,
      error: message,
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
} 