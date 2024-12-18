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

  useEffect(() => {
    // Fetch the user's session token
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

    // Ensure the user is logged in
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      throw new Error('Authentication required');
    }

    // Call the API with Authorization header
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
    if (result.error) {
      throw new Error(result.error);
    }

    return { novelId: result.novelId, params };
  }, {
    onSuccess: ({ novelId }) => {
      setNovelId(novelId);
      setIsGenerated(true);
      Logger.info(`Novel record created ${novelId}`);
      // The backend process starts the LLM generation after insert
    },
    onError: (error: any) => {
      Logger.error('Gen initiation error:', error);
      alert(`Error: ${error.message}`);
    }
  });

  const handleFormSubmit = (params: NovelParameters) => {
    setLastParams(params);
    generateNovelMutation.mutate(params);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Create Your Novel</h1>
      {!isGenerated ? (
        <ParameterForm onSubmit={handleFormSubmit} />
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