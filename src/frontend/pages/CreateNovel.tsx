import React, { useState } from 'react';
import ParameterForm from '../components/ParameterForm';
import ProgressBar from '../components/ProgressBar';
import DownloadButton from '../components/DownloadButton';
import { NovelParameters } from '../../services/novel/NovelParameters';
import { useMutation } from '@tanstack/react-query';
import { Logger } from '../../services/utils/Logger';
import { supabase } from '../../integrations/supabase/client';

const CreateNovel: React.FC = () => {
  const [novelId, setNovelId] = useState<string>('');
  const [isGenerated, setIsGenerated] = useState<boolean>(false);

  const generateNovelMutation = useMutation(async (params: NovelParameters) => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw new Error('Authentication required');

    const { data, error } = await supabase
      .from('novels')
      .insert([{
        title: params.title || 'Untitled Novel',
        parameters: params,
        user_id: userData.user.id
      }])
      .select('id')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data.id;
  }, {
    onSuccess: (id:string) => {
      setNovelId(id);
      setIsGenerated(true);
      Logger.info(`Novel gen initiated ${id}`);
    },
    onError: (error:any) => {
      Logger.error('Gen initiation error:',error);
      alert(`Error: ${error.message}`);
    }
  });

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