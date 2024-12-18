-- Start fresh by dropping all related tables
DROP TABLE IF EXISTS public.novel_chapters CASCADE;
DROP TABLE IF EXISTS public.temp_novel_data CASCADE;
DROP TABLE IF EXISTS public.novel_generation_states CASCADE;
DROP TABLE IF EXISTS public.novels CASCADE;

-- Create base novels table
CREATE TABLE public.novels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    parameters JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create generation states table
CREATE TABLE public.novel_generation_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novel_id UUID REFERENCES public.novels(id) ON DELETE CASCADE,
    current_chapter INT DEFAULT 0,
    total_chapters INT DEFAULT 0,
    status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'error')) DEFAULT 'pending',
    error_message TEXT,
    outline_version INT DEFAULT 0 NOT NULL,
    outline_status TEXT CHECK (outline_status IN ('initial', 'pass1', 'pass2', 'completed')) DEFAULT 'initial' NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create chapters table
CREATE TABLE public.novel_chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novel_id UUID REFERENCES public.novels(id) ON DELETE CASCADE,
    chapter_number INT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(novel_id, chapter_number)
);

-- Create temporary data table
CREATE TABLE public.temp_novel_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novel_id UUID REFERENCES public.novels(id) ON DELETE CASCADE,
    data_type TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_novel_generation_states_outline ON public.novel_generation_states(novel_id, outline_version);
CREATE INDEX idx_novel_chapters_order ON public.novel_chapters(novel_id, chapter_number);
CREATE INDEX idx_temp_novel_data_type ON public.temp_novel_data(novel_id, data_type);

-- Enable RLS on all tables
ALTER TABLE public.novels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.novel_generation_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.novel_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temp_novel_data ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON public.novels TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.novel_generation_states TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.novel_chapters TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.temp_novel_data TO postgres, anon, authenticated, service_role;

-- Novels policies
CREATE POLICY "novels_select" ON public.novels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "novels_insert" ON public.novels FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "novels_update" ON public.novels FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "novels_delete" ON public.novels FOR DELETE USING (auth.uid() = user_id);

-- Generation states policies
CREATE POLICY "state_select" ON public.novel_generation_states FOR SELECT 
    USING (novel_id IN (SELECT id FROM public.novels WHERE user_id = auth.uid()));
CREATE POLICY "state_insert" ON public.novel_generation_states FOR INSERT 
    WITH CHECK (novel_id IN (SELECT id FROM public.novels WHERE user_id = auth.uid()));
CREATE POLICY "state_update" ON public.novel_generation_states FOR UPDATE 
    USING (novel_id IN (SELECT id FROM public.novels WHERE user_id = auth.uid()))
    WITH CHECK (novel_id IN (SELECT id FROM public.novels WHERE user_id = auth.uid()));
CREATE POLICY "state_delete" ON public.novel_generation_states FOR DELETE 
    USING (novel_id IN (SELECT id FROM public.novels WHERE user_id = auth.uid()));

-- Chapters policies
CREATE POLICY "chapters_select" ON public.novel_chapters FOR SELECT 
    USING (novel_id IN (SELECT id FROM public.novels WHERE user_id = auth.uid()));
CREATE POLICY "chapters_insert" ON public.novel_chapters FOR INSERT 
    WITH CHECK (novel_id IN (SELECT id FROM public.novels WHERE user_id = auth.uid()));
CREATE POLICY "chapters_update" ON public.novel_chapters FOR UPDATE 
    USING (novel_id IN (SELECT id FROM public.novels WHERE user_id = auth.uid()))
    WITH CHECK (novel_id IN (SELECT id FROM public.novels WHERE user_id = auth.uid()));
CREATE POLICY "chapters_delete" ON public.novel_chapters FOR DELETE 
    USING (novel_id IN (SELECT id FROM public.novels WHERE user_id = auth.uid()));

-- Temp data policies
CREATE POLICY "temp_data_select" ON public.temp_novel_data FOR SELECT 
    USING (novel_id IN (SELECT id FROM public.novels WHERE user_id = auth.uid()));
CREATE POLICY "temp_data_insert" ON public.temp_novel_data FOR INSERT 
    WITH CHECK (novel_id IN (SELECT id FROM public.novels WHERE user_id = auth.uid()));
CREATE POLICY "temp_data_update" ON public.temp_novel_data FOR UPDATE 
    USING (novel_id IN (SELECT id FROM public.novels WHERE user_id = auth.uid()))
    WITH CHECK (novel_id IN (SELECT id FROM public.novels WHERE user_id = auth.uid()));
CREATE POLICY "temp_data_delete" ON public.temp_novel_data FOR DELETE 
    USING (novel_id IN (SELECT id FROM public.novels WHERE user_id = auth.uid()));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_novels_updated_at
    BEFORE UPDATE ON public.novels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_generation_states_updated_at
    BEFORE UPDATE ON public.novel_generation_states
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';
SELECT pg_notify('pgrst', 'reload schema');
SELECT pg_notify('supabase_realtime', 'reload schema');
