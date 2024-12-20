import { NextApiRequest, NextApiResponse } from 'next';
import { createCheckpointContext } from '../shared/validation';
import { supabase } from '../../../../integrations/supabase/client';
import { llm } from '../../../../services/novel/LLMClient';
import { Logger } from '../../../../services/utils/Logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const context = await createCheckpointContext(req);
    const { novelId } = context;

    // Fetch current novel state
    const { data: novelData, error: fetchError } = await supabase
      .from('novels')
      .select('outline_data, outline_status, parameters')
      .eq('id', novelId)
      .single();

    if (fetchError) {
      Logger.error('Failed to fetch novel data:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch novel data' });
    }

    if (!novelData) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    // Validate outline data
    if (!novelData.outline_data?.current) {
      Logger.error('Initial outline not found:', { novelId, outlineData: novelData.outline_data });
      return res.status(400).json({ error: 'Initial outline not found' });
    }

    if (novelData.outline_status !== 'initial') {
      Logger.error('Invalid outline status for revision one:', { novelId, status: novelData.outline_status });
      return res.status(400).json({ error: 'Invalid outline status for revision one' });
    }

    // Generate revised outline
    const revisedOutline = await llm.generate({
      prompt: `Given this initial outline:\n${JSON.stringify(novelData.outline_data.current)}\n\nRevise and improve this outline based on these parameters:\n${JSON.stringify(novelData.parameters)}`,
      temperature: 0.7,
      max_tokens: 2000
    });

    if (!revisedOutline) {
      Logger.error('Failed to generate revised outline:', { novelId });
      return res.status(500).json({ error: 'Failed to generate revised outline' });
    }

    // Update novel with revised outline
    const { error: updateError } = await supabase
      .from('novels')
      .update({
        outline_data: {
          current: revisedOutline,
          iterations: [...(novelData.outline_data.iterations || []), novelData.outline_data.current]
        },
        outline_status: 'pass1',
        updated_at: new Date().toISOString()
      })
      .eq('id', novelId);

    if (updateError) {
      Logger.error('Failed to update novel with revised outline:', updateError);
      return res.status(500).json({ error: 'Failed to update novel with revised outline' });
    }

    Logger.info('Successfully generated and stored revised outline:', { novelId });
    return res.status(200).json({ success: true });
  } catch (error) {
    Logger.error('Error in revision-one endpoint:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'An unknown error occurred' });
  }
} 