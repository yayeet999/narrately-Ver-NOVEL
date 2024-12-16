import React, { useEffect, useState } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { Logger } from '../../services/utils/Logger';

interface ProgressBarProps {
 novelId: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ novelId }) => {
 const [currentChapter, setCurrentChapter] = useState<number>(0);
 const [totalChapters, setTotalChapters] = useState<number>(0);
 const [status, setStatus] = useState<string>('in_progress');
 const [errorMessage, setErrorMessage] = useState<string>('');

 useEffect(() => {
   const fetchProgress = async () => {
     const { data, error } = await supabase
       .from('novel_generation_states')
       .select('*')
       .eq('novel_id', novelId)
       .single();

     if (error) {
       Logger.error('Error fetching progress:', error);
       return;
     }

     if (data) {
       setCurrentChapter(data.current_chapter);
       setTotalChapters(data.total_chapters);
       setStatus(data.status);
       setErrorMessage(data.error_message || '');
     }
   };

   fetchProgress();
   const interval = setInterval(fetchProgress, 5000);
   return () => clearInterval(interval);
 }, [novelId]);

 const progressPercentage = totalChapters ? (currentChapter/totalChapters)*100 : 0;

 return (
   <div className="space-y-4">
     <div>
       <label className="font-semibold">Generation Status: {status}</label>
       {status==='error' && <p className="text-red-500">Error: {errorMessage}</p>}
     </div>
     <div className="w-full bg-gray-300 rounded-full h-4">
       <div className="bg-blue-600 h-4 rounded-full transition-all duration-500" style={{width:`${progressPercentage}%`}}></div>
     </div>
     <p className="text-sm text-gray-600">
       {currentChapter}/{totalChapters} Chapters ({progressPercentage.toFixed(2)}%)
     </p>
   </div>
 );
};

export default ProgressBar; 