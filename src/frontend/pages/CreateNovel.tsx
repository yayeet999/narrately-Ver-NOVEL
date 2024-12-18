import React, { useState } from 'react';
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

  // Mutation to create the novel record and initial generation state
  const generateNovelMutation = useMutation(
    async (params: NovelParameters) => {
      // Ensure the user is logged in
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session || !session.user) {
        throw new Error('User must be authenticated to generate a novel.');
      }

      // Insert the novel record
      const { data: novel, error: novelError } = await supabase
        .from('novels')
        .insert([{
          title: params.title || 'Untitled Novel',
          parameters: params,
          user_id: session.user.id
        }])
        .select('id')
        .single();

      if (novelError) {
        throw new Error(`Failed to create novel: ${novelError.message}`);
      }

      if (!novel || !novel.id) {
        throw new Error('Novel creation returned no ID.');
      }

      // Insert the novel generation state (pending)
      const { error: stateError } = await supabase
        .from('novel_generation_states')
        .insert([{
          novel_id: novel.id,
          current_chapter: 0,
          total_chapters: 0,
          status: 'pending',
          error_message: null
        }])
        .select()
        .single();

      if (stateError) {
        // If state creation fails, clean up by deleting the novel
        await supabase.from('novels').delete().eq('id', novel.id);
        Logger.error('State creation error:', stateError);
        throw new Error(`Failed to create generation state: ${stateError.message}`);
      }

      Logger.info('Initial novel record and generation state created', novel.id);
      return { novelId: novel.id, params, accessToken: session.access_token, userId: session.user.id };
    },
    {
      onSuccess: async ({ novelId, params, accessToken, userId }) => {
        setNovelId(novelId);
        setIsGenerated(true);
        Logger.info(`Novel record created ${novelId}`);

        // Trigger the backend generation process with the user's access token
        const response = await fetch('/api/generate-novel', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            user_id: userId,
            parameters: params
          })
        });

        const result = await response.json();
        if (result.error) {
          alert(`Generation error: ${result.error}`);
        } else {
          Logger.info('Novel generation triggered:', result.novelId);
        }
      },
      onError: (error: any) => {
        Logger.error('Gen initiation error:', error);
        alert(`Error: ${error.message}`);
      }
    }
  );

  const handleFormSubmit = (params: NovelParameters) => {
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