import React from 'react';
import { supabase } from '../../integrations/supabase/client';
import { Logger } from '../../services/utils/Logger';

interface DownloadButtonProps {
  novelId: string;
}

const DownloadButton: React.FC<DownloadButtonProps> = ({ novelId }) => {
  const handleDownload = async () => {
    try {
      const { data, error } = await supabase
        .from('novel_chapters')
        .select('*')
        .eq('novel_id', novelId)
        .order('chapter_number', { ascending: true });

      if (error) {
        Logger.error('Error fetching chapters:', error);
        alert('Download failed.');
        return;
      }

      const chapters = data || [];
      const content = chapters.map(ch=>`Chapter ${ch.chapter_number}\n\n${ch.content}`).join('\n\n');
      const blob = new Blob([content],{type:'text/plain'});
      const url = URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url;
      a.download='novel.txt';
      a.click();
      URL.revokeObjectURL(url);
      Logger.info(`Downloaded novel ${novelId}`);
    } catch(error) {
      Logger.error('Download error:', error);
      alert('Unexpected error.');
    }
  };

  return (
    <button onClick={handleDownload} className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">
      Download Novel
    </button>
  );
};

export default DownloadButton; 