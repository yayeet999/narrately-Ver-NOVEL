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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setAccessToken(session.access_token);
      }
    });
  }, []);

  const generateNovelMutation = useMutation(async (params: NovelParameters) => {
    if (!accessToken) {
      throw new Error('User not authenticated. No access token found.');
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      throw new Error('Authentication required');
    }

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

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'An error occurred while generating the novel');
    }

    return { novelId: result.novelId, params };
  }, {
    onSuccess: ({ novelId }) => {
      setNovelId(novelId);
      setIsGenerated(true);
      setErrorMessage('');
      Logger.info(`Novel record created ${novelId}`);
    },
    onError: (error: any) => {
      Logger.error('Generation initiation error:', error);
      setErrorMessage(error.message || 'An unexpected error occurred. Please try again.');
      setIsGenerated(false);
    },
    retry: (failureCount, error: any) => {
      // Retry up to 3 times for specific errors
      if (failureCount < 3) {
        const status = (error as any)?.response?.status;
        return status === 504 || status === 429; // Retry on timeout or rate limit
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * (2 ** attemptIndex), 10000) // Exponential backoff
  });

  const handleFormSubmit = (params: NovelParameters) => {
    setLastParams(params);
    setErrorMessage('');
    generateNovelMutation.mutate(params);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Create Your Novel</h1>
      
      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6" role="alert">
          <p>{errorMessage}</p>
        </div>
      )}

      {!isGenerated ? (
        <ParameterForm onSubmit={handleFormSubmit} />
      ) : (
        <div className="space-y-6">
          <ProgressBar novelId={novelId} />
          <DownloadButton novelId={novelId} />
          {generateNovelMutation.isLoading && (
            <div className="text-gray-600">
              Initializing generation process...
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CreateNovel;
