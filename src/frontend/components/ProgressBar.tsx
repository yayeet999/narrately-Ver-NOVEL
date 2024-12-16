import React, { useEffect, useState } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { Logger } from '../../services/utils/Logger';

interface ProgressBarProps {
  novelId: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ novelId }) => {
  const [currentChapter, setCurrentChapter] = useState<number>(0);
  const [totalChapters, setTotalChapters] = useState<number>(0);
  const [status, setStatus] = useState<string>('pending');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const { data, error } = await supabase
          .from('novel_generation_states')
          .select('current_chapter, total_chapters, status, error_message')
          .eq('novel_id', novelId)
          .maybeSingle();

        if (error) {
          Logger.error('Error fetching progress:', error);
          setErrorMessage(error.message);
          setStatus('error');
          return;
        }

        Logger.info('Progress data:', data);

        if (data) {
          setCurrentChapter(data.current_chapter || 0);
          setTotalChapters(data.total_chapters || 0);
          setStatus(data.status || 'pending');
          setErrorMessage(data.error_message || '');
        } else {
          Logger.warn('No generation state found for novel:', novelId);
          setCurrentChapter(0);
          setTotalChapters(0);
          setStatus('pending');
          setErrorMessage('');
        }
      } catch (err) {
        Logger.error('Unexpected error:', err);
        setErrorMessage('Unexpected error occurred');
        setStatus('error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgress();
    const interval = setInterval(fetchProgress, 5000);
    return () => clearInterval(interval);
  }, [novelId]);

  const progressPercentage = totalChapters ? (currentChapter / totalChapters)*100 : 0;

  if (isLoading) {
    return <div className="animate-pulse">Loading generation status...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="font-semibold">
          Generation Status: {status.charAt(0).toUpperCase() + status.slice(1)}
        </label>
        {errorMessage && (
          <p className="text-red-500 mt-2">Error: {errorMessage}</p>
        )}
      </div>
      <div className="w-full bg-gray-300 rounded-full h-4">
        <div 
          className={`h-4 rounded-full transition-all duration-500 ${
            status === 'error' ? 'bg-red-600' : 'bg-blue-600'
          }`}
          style={{width:`${progressPercentage}%`}}
        ></div>
      </div>
      <p className="text-sm text-gray-600">
        {currentChapter}/{totalChapters} Chapters ({progressPercentage.toFixed(1)}%)
      </p>
    </div>
  );
};

export default ProgressBar; 