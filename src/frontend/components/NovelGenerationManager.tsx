import React, { useEffect, useState } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { Logger } from '../../services/utils/Logger';
import ProgressBar from './ProgressBar';

interface NovelGenerationManagerProps {
  novelId: string;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const NovelGenerationManager: React.FC<NovelGenerationManagerProps> = ({ novelId }) => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);

  const handleError = async (error: any, errorMessage: string) => {
    Logger.error(errorMessage, error);
    
    // Update novel error state
    await supabase
      .from('novels')
      .update({
        error: errorMessage,
        updated_at: new Date().toISOString()
      })
      .eq('id', novelId);

    // Increment retry count and reset processing state
    setRetryCount(prev => prev + 1);
    setIsProcessing(false);
  };

  const makeApiCall = async (endpoint: string, novelId: string): Promise<boolean> => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        throw new Error('No active session');
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session.access_token}`
        },
        body: JSON.stringify({
          novelId,
          user_id: session.data.session.user.id,
          parameters: {} // This will be fetched from the server
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `API call failed: ${response.status}`);
      }

      return true;
    } catch (error) {
      if (retryCount < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
        return false;
      }
      throw error;
    }
  };

  useEffect(() => {
    const processNextStep = async () => {
      if (isProcessing) return;

      try {
        setIsProcessing(true);

        // Get current novel state with error handling
        const { data: novelData, error: fetchError } = await supabase
          .from('novels')
          .select('novel_status, outline_status, current_chapter, total_chapters, error, parameters')
          .eq('id', novelId)
          .single();

        if (fetchError) {
          throw new Error(`Failed to fetch novel state: ${fetchError.message}`);
        }

        if (!novelData) {
          throw new Error('Novel not found');
        }

        // Reset retry count if we successfully got the novel state
        setRetryCount(0);

        // If there's an error, don't proceed unless we're retrying
        if (novelData.error && retryCount === 0) {
          setIsProcessing(false);
          return;
        }

        Logger.info('Current novel state:', novelData);

        // Process based on current state
        if (novelData.novel_status === 'initializing') {
          // Start outline generation
          const success = await makeApiCall('/api/novel-checkpoints/outline/initial', novelId);
          if (success) {
            await supabase
              .from('novels')
              .update({ 
                novel_status: 'outline_in_progress',
                error: null,
                updated_at: new Date().toISOString()
              })
              .eq('id', novelId);
          }
        } else if (novelData.novel_status === 'outline_in_progress') {
          if (novelData.outline_status === 'initial') {
            await makeApiCall('/api/novel-checkpoints/outline/revision-one', novelId);
          } else if (novelData.outline_status === 'pass1') {
            await makeApiCall('/api/novel-checkpoints/outline/revision-two', novelId);
          } else if (novelData.outline_status === 'pass2') {
            await makeApiCall('/api/novel-checkpoints/outline/finalize', novelId);
          }
        } else if (novelData.novel_status === 'outline_completed') {
          await makeApiCall('/api/novel-checkpoints/chapters/initial', novelId);
        } else if (novelData.novel_status === 'in_progress') {
          if (novelData.current_chapter < novelData.total_chapters) {
            await makeApiCall('/api/novel-checkpoints/chapters/initial', novelId);
          }
        }

        setIsProcessing(false);
      } catch (error) {
        await handleError(error, error instanceof Error ? error.message : 'An unknown error occurred');
      }
    };

    // Process next step immediately and then every 10 seconds
    processNextStep();
    const interval = setInterval(processNextStep, 10000);
    return () => clearInterval(interval);
  }, [novelId, isProcessing, retryCount]);

  return <ProgressBar novelId={novelId} />;
};

export default NovelGenerationManager; 