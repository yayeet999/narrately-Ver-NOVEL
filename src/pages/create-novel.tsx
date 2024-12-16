import React, { useState } from 'react';
import ParameterForm from '../frontend/components/ParameterForm';
import ProgressBar from '../frontend/components/ProgressBar';
import DownloadButton from '../frontend/components/DownloadButton';
import { NovelParameters } from '../services/novel/NovelParameters';
import { useMutation } from '@tanstack/react-query';
import { Logger } from '../services/utils/Logger';
import { supabase } from '../integrations/supabase/client';

const CreateNovel: React.FC = () => {
 const [novelId, setNovelId] = useState<string>('');
 const [isGenerated, setIsGenerated] = useState<boolean>(false);

 const generateNovelMutation = useMutation(async (params: NovelParameters) => {
   try {
     // Start a Supabase transaction by creating the novel first
     const { data: novel, error: novelError } = await supabase
       .from('novels')
       .insert([{ 
         ...params,
         user_id: (await supabase.auth.getUser()).data.user?.id
       }])
       .select('id')
       .single();

     if (novelError) {
       throw new Error(novelError.message);
     }

     if (!novel) {
       throw new Error('Failed to create novel');
     }

     // Create the generation state record
     const { error: stateError } = await supabase
       .from('novel_generation_states')
       .insert([{
         novel_id: novel.id,
         current_chapter: 0,
         total_chapters: 0,
         status: 'pending',
         error_message: null
       }]);

     if (stateError) {
       // If state creation fails, clean up the novel
       await supabase.from('novels').delete().eq('id', novel.id);
       throw new Error(`Failed to create generation state: ${stateError.message}`);
     }

     return novel.id;
   } catch (error: any) {
     Logger.error('Novel creation error:', error);
     throw error;
   }
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