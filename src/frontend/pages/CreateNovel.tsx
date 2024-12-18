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
  const [lastParams, setLastParams] = useState<NovelParameters | null>(null);

  const generateNovelMutation = useMutation(async (params: NovelParameters) => {
    try {
      // Ensure the user is logged in
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error('Authentication required');
      }

      // Insert the novel record
      const { data: novel, error: novelError } = await supabase
        .from('novels')
        .insert([{
          title: params.title || 'Untitled Novel',
          parameters: params,
          user_id: userData.user.id
        }])
        .select('id')
        .single();

      if (novelError) {
        throw new Error(novelError.message);
      }

      if (!novel) {
        throw new Error('Failed to create novel');
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

      Logger.info('Generation state created');
      return { novelId: novel.id, params };
    } catch (error: any) {
      Logger.error('Novel creation error:', error);
      throw error;
    }
  }, {
    onSuccess: async ({ novelId, params }) => {
      setNovelId(novelId);
      setIsGenerated(true);
      Logger.info(`Novel record created ${novelId}`);

      // Trigger the backend generation process
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        alert("User authentication required.");
        return;
      }

      const response = await fetch('/api/generate-novel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userData.user.id,
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