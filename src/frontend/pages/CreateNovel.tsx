import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import ParameterForm from '../components/ParameterForm';
import ProgressBar from '../components/ProgressBar';
import DownloadButton from '../components/DownloadButton';
import { NovelParameters } from '../../services/novel/NovelParameters';
import { Logger } from '../../services/utils/Logger';
import { supabase } from '../../integrations/supabase/client';

const CreateNovel: React.FC = () => {
  const [novelId, setNovelId] = useState<string>('');
  const [isGenerated, setIsGenerated] = useState<boolean>(false);
  const [lastParams, setLastParams] = useState<NovelParameters | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setAccessToken(session.access_token);
      }
    });
  }, []);

  const generateNovelMutation = useMutation({
    mutationFn: async (params: NovelParameters) => {
      setIsLoading(true);
      setErrorMessage('');
      
      if (!accessToken) {
        throw new Error('User not authenticated. Please log in again.');
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error('Authentication required. Please log in again.');
      }

      try {
        const response = await fetch('/api/generate-novel', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            user_id: userData.user.id,
            parameters: params
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(
            errorData?.error || 
            `Server error (${response.status}). Please try again.`
          );
        }

        const result = await response.json();
        if (!result.novelId) {
          throw new Error('Invalid server response. Please try again.');
        }

        return { novelId: result.novelId, params };
      } catch (error: any) {
        Logger.error('Novel generation error:', error);
        if (error.message.includes('fetch')) {
          throw new Error('Network error. Please check your connection and try again.');
        }
        throw error;
      }
    },
    onSuccess: ({ novelId }) => {
      setNovelId(novelId);
      setIsGenerated(true);
      setErrorMessage('');
      setIsLoading(false);
      Logger.info(`Novel generation started: ${novelId}`);
    },
    onError: (error: Error) => {
      setErrorMessage(error.message || 'An unexpected error occurred. Please try again.');
      setIsLoading(false);
      setIsGenerated(false);
      Logger.error('Generation error:', error);
    },
    onSettled: () => {
      setIsLoading(false);
    },
    retry: (failureCount, error: any) => {
      if (failureCount < 2 && error?.message?.includes('504')) {
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * (2 ** attemptIndex), 5000)
  });

  const handleFormSubmit = (params: NovelParameters) => {
    if (isLoading) return;
    setLastParams(params);
    generateNovelMutation.mutate(params);
  };

  const handleRetry = () => {
    if (lastParams) {
      handleFormSubmit(lastParams);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Create Your Novel</h1>

      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <div className="flex justify-between items-center">
            <div>
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{errorMessage}</span>
            </div>
            <button
              onClick={handleRetry}
              className="bg-red-700 text-white px-4 py-2 rounded hover:bg-red-800 ml-4"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-700">Generating your novel...</p>
          </div>
        </div>
      )}

      {!isGenerated ? (
        <ParameterForm onSubmit={handleFormSubmit} disabled={isLoading} />
      ) : (
        <div className="space-y-6">
          <ProgressBar novelId={novelId} />
          <DownloadButton novelId={novelId} />
        </div>
      )}
    </div>
  );
};

export default CreateNovel;
