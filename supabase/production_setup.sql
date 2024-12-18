-- Start fresh by dropping existing objects
DROP TABLE IF EXISTS public.novel_chapters CASCADE;
DROP TABLE IF EXISTS public.novel_generation_states CASCADE;
DROP TABLE IF EXISTS public.novels CASCADE;
DROP TYPE IF EXISTS public.outline_status_enum CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
DROP FUNCTION IF EXISTS update_outline_version CASCADE;

-- Create the outline status enum type
CREATE TYPE public.outline_status_enum AS ENUM ('initial', 'pass1', 'pass2', 'completed');

-- Create the novels table (parent table)
CREATE TABLE public.novels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    parameters JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT valid_parameters CHECK (jsonb_typeof(parameters) = 'object')
);

-- Create the generation states table with outline tracking
CREATE TABLE public.novel_generation_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novel_id UUID REFERENCES public.novels(id) ON DELETE CASCADE NOT NULL,
    current_chapter INTEGER DEFAULT 0 NOT NULL CHECK (current_chapter >= 0),
    total_chapters INTEGER DEFAULT 0 NOT NULL CHECK (total_chapters >= 0),
    status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'error')) DEFAULT 'pending',
    error_message TEXT,
    outline_version INTEGER DEFAULT 0 NOT NULL CHECK (outline_version >= 0),
    outline_status outline_status_enum DEFAULT 'initial' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(novel_id)
);

-- Create the chapters table
CREATE TABLE public.novel_chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novel_id UUID REFERENCES public.novels(id) ON DELETE CASCADE NOT NULL,
    chapter_number INTEGER NOT NULL CHECK (chapter_number > 0),
    content TEXT NOT NULL CHECK (length(content) > 0),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(novel_id, chapter_number)
);

-- Create indexes for performance
CREATE INDEX idx_novels_user_id ON public.novels(user_id);
CREATE INDEX idx_novel_generation_states_novel_id ON public.novel_generation_states(novel_id);
CREATE INDEX idx_novel_generation_states_outline ON public.novel_generation_states(novel_id, outline_version);
CREATE INDEX idx_novel_chapters_novel_id_number ON public.novel_chapters(novel_id, chapter_number);

-- Create function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function for updating outline version
CREATE OR REPLACE FUNCTION update_outline_version()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.data_type LIKE 'outline_v%' THEN
        UPDATE public.novel_generation_states
        SET 
            outline_version = (NEW.metadata->>'version')::int,
            outline_status = CASE (NEW.metadata->>'version')::int
                WHEN 0 THEN 'initial'::outline_status_enum
                WHEN 1 THEN 'pass1'::outline_status_enum
                WHEN 2 THEN 'pass2'::outline_status_enum
                WHEN 3 THEN 'completed'::outline_status_enum
                ELSE outline_status
            END
        WHERE novel_id = NEW.novel_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_novels_updated_at
    BEFORE UPDATE ON public.novels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_generation_states_updated_at
    BEFORE UPDATE ON public.novel_generation_states
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_outline_version_trigger
    AFTER INSERT OR UPDATE ON public.temp_novel_data
    FOR EACH ROW
    EXECUTE FUNCTION update_outline_version();

-- Enable Row Level Security
ALTER TABLE public.novels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.novel_generation_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.novel_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temp_novel_data ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON TYPE public.outline_status_enum TO authenticated;

-- Ensure service role has full access
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;
GRANT USAGE ON TYPE public.outline_status_enum TO service_role;

-- RLS Policies for novels
CREATE POLICY "Users can view their own novels"
    ON public.novels FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own novels"
    ON public.novels FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own novels"
    ON public.novels FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own novels"
    ON public.novels FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for novel_generation_states
CREATE POLICY "View own novel states"
    ON public.novel_generation_states FOR SELECT
    USING (novel_id IN (SELECT id FROM public.novels WHERE user_id = auth.uid()));

CREATE POLICY "Create own novel states"
    ON public.novel_generation_states FOR INSERT
    WITH CHECK (novel_id IN (SELECT id FROM public.novels WHERE user_id = auth.uid()));

CREATE POLICY "Update own novel states"
    ON public.novel_generation_states FOR UPDATE
    USING (novel_id IN (SELECT id FROM public.novels WHERE user_id = auth.uid()));

CREATE POLICY "Delete own novel states"
    ON public.novel_generation_states FOR DELETE
    USING (novel_id IN (SELECT id FROM public.novels WHERE user_id = auth.uid()));

-- RLS Policies for novel_chapters
CREATE POLICY "View own chapters"
    ON public.novel_chapters FOR SELECT
    USING (novel_id IN (SELECT id FROM public.novels WHERE user_id = auth.uid()));

CREATE POLICY "Create own chapters"
    ON public.novel_chapters FOR INSERT
    WITH CHECK (novel_id IN (SELECT id FROM public.novels WHERE user_id = auth.uid()));

CREATE POLICY "Update own chapters"
    ON public.novel_chapters FOR UPDATE
    USING (novel_id IN (SELECT id FROM public.novels WHERE user_id = auth.uid()));

CREATE POLICY "Delete own chapters"
    ON public.novel_chapters FOR DELETE
    USING (novel_id IN (SELECT id FROM public.novels WHERE user_id = auth.uid()));

-- RLS Policies for temp_novel_data
CREATE POLICY "View own temp data"
    ON public.temp_novel_data FOR SELECT
    USING (novel_id IN (SELECT id FROM public.novels WHERE user_id = auth.uid()));

CREATE POLICY "Create own temp data"
    ON public.temp_novel_data FOR INSERT
    WITH CHECK (novel_id IN (SELECT id FROM public.novels WHERE user_id = auth.uid()));

CREATE POLICY "Update own temp data"
    ON public.temp_novel_data FOR UPDATE
    USING (novel_id IN (SELECT id FROM public.novels WHERE user_id = auth.uid()));

CREATE POLICY "Delete own temp data"
    ON public.temp_novel_data FOR DELETE
    USING (novel_id IN (SELECT id FROM public.novels WHERE user_id = auth.uid()));

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';
SELECT pg_notify('pgrst', 'reload schema');
SELECT pg_notify('supabase_realtime', 'reload schema');