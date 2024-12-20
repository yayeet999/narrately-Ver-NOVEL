import React, { useEffect, useState } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { Logger } from '../../services/utils/Logger';
import ProgressBar from './ProgressBar';

interface NovelGenerationManagerProps {
  novelId: string;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const POLL_INTERVAL = 5000;

const NovelGenerationManager: React.FC<NovelGenerationManagerProps> = ({ novelId }) => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);

  const handleError = async (error: any, errorMessage: string) => {
    Logger.error(errorMessage, error);
    
    await supabase
      .from('novels')
      .update({
        error: errorMessage,
        updated_at: new Date().toISOString()
      })
      .eq('id', novelId);

    setRetryCount(prev => prev + 1);
    setIsProcessing(false);
  };

  const makeApiCall = async (endpoint: string, novelId: string): Promise<boolean> => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        throw new Error('No active session');
      }

      // Fetch novel data first
      const { data: novelData, error: fetchError } = await supabase
        .from('novels')
        .select('parameters, outline_data, outline_status')
        .eq('id', novelId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch novel data: ${fetchError.message}`);
      }

      if (!novelData?.parameters) {
        throw new Error('Novel parameters not found');
      }

      // For revision endpoints, ensure we have the initial outline
      if (endpoint.includes('revision') && (!novelData.outline_data?.current || !novelData.outline_status)) {
        throw new Error('Initial outline not ready for revision');
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
          parameters: novelData.parameters
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `API call failed: ${response.status} ${response.statusText}` +
          (errorData.error ? ` - ${errorData.error}` : '')
        );
      }

      const responseData = await response.json();
      return responseData.success === true;

    } catch (error) {
      Logger.error('API call failed:', error);
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

        const { data: novelData, error: fetchError } = await supabase
          .from('novels')
          .select('novel_status, outline_status, current_chapter, total_chapters, error, parameters, outline_data')
          .eq('id', novelId)
          .single();

        if (fetchError) {
          throw new Error(`Failed to fetch novel state: ${fetchError.message}`);
        }

        if (!novelData) {
          throw new Error('Novel not found');
        }

        setRetryCount(0);

        if (novelData.error && retryCount === 0) {
          setIsProcessing(false);
          return;
        }

        Logger.info('Current novel state:', novelData);

        // Process based on current state
        if (novelData.novel_status === 'initializing') {
          await makeApiCall('/api/novel-checkpoints/outline/initial', novelId);
        } else if (novelData.novel_status === 'outline_in_progress') {
          // Add delay between state transitions
          await new Promise(resolve => setTimeout(resolve, 2000));

          if (novelData.outline_status === 'initial' && novelData.outline_data?.current) {
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

    processNextStep();
    const interval = setInterval(processNextStep, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [novelId, isProcessing, retryCount]);

  return <ProgressBar novelId={novelId} />;
};

export default NovelGenerationManager; 