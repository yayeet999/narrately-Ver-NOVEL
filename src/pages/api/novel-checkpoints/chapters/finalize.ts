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
    
    // Get the novel data and chapter info
    const { data: novelData, error: novelError } = await supabase
      .from('novels')
      .select('chapters_data, current_chapter, total_chapters')
      .eq('id', novelId)
      .single();

    if (novelError || !novelData?.chapters_data?.chapters) {
      throw new Error('Failed to fetch novel data');
    }

    const currentChapter = novelData.current_chapter;
    const chapterData = novelData.chapters_data.chapters.find(
      (ch: ChapterData) => ch.chapter_number === currentChapter
    );

    if (!chapterData || chapterData.status !== 'revision_two') {
      throw new Error(`Invalid chapter state for finalization: ${currentChapter}`);
    }

    // Update chapter status to completed
    const updatedChapters = novelData.chapters_data.chapters.map((ch: ChapterData) =>
      ch.chapter_number === currentChapter
        ? {
            ...ch,
            version: 3,
            status: 'completed',
            timestamp: new Date().toISOString()
          }
        : ch
    );

    // Check if this was the last chapter
    const isLastChapter = currentChapter === novelData.total_chapters;
    const novelStatus = isLastChapter ? 'completed' : 'in_progress';

    // Update novel with completed chapter
    const { error: updateError } = await supabase
      .from('novels')
      .update({
        chapters_data: {
          ...novelData.chapters_data,
          chapters: updatedChapters
        },
        novel_status: novelStatus
      })
      .eq('id', novelId);

    if (updateError) {
      throw updateError;
    }

    Logger.info(`Chapter ${currentChapter} finalized for novel ${novelId}`);
    return res.status(200).json({
      success: true,
      novelId: novelId
    });

  } catch (error) {
    Logger.error('Error in chapter finalization:', error);
    
    const statusCode = error instanceof ValidationError ? 400 : 500;
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    
    return res.status(statusCode).json({
      success: false,
      error: message,
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
} 