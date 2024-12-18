-- Recreate the table to ensure clean state
DROP TABLE IF EXISTS public.novel_generation_states CASCADE;
CREATE TABLE public.novel_generation_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novel_id UUID REFERENCES novels(id) ON DELETE CASCADE,
    current_chapter INT DEFAULT 0,
    total_chapters INT DEFAULT 0,
    status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'error')) DEFAULT 'pending',
    error_message TEXT,
    outline_version INT DEFAULT 0 NOT NULL,
    outline_status TEXT CHECK (outline_status IN ('initial', 'pass1', 'pass2', 'completed')) DEFAULT 'initial' NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant necessary permissions
GRANT ALL ON public.novel_generation_states TO postgres;
GRANT ALL ON public.novel_generation_states TO anon;
GRANT ALL ON public.novel_generation_states TO authenticated;
GRANT ALL ON public.novel_generation_states TO service_role;

-- Enable RLS
ALTER TABLE public.novel_generation_states ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "state_select" ON public.novel_generation_states;
DROP POLICY IF EXISTS "state_insert" ON public.novel_generation_states;
DROP POLICY IF EXISTS "state_update" ON public.novel_generation_states;
DROP POLICY IF EXISTS "state_delete" ON public.novel_generation_states;

-- Recreate policies
CREATE POLICY "state_select" ON public.novel_generation_states 
    FOR SELECT USING (
        novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
    );

CREATE POLICY "state_insert" ON public.novel_generation_states 
    FOR INSERT WITH CHECK (
        novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
    );

CREATE POLICY "state_update" ON public.novel_generation_states 
    FOR UPDATE USING (
        novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
    ) WITH CHECK (
        novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
    );

CREATE POLICY "state_delete" ON public.novel_generation_states 
    FOR DELETE USING (
        novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
    );

-- Create index
CREATE INDEX IF NOT EXISTS idx_novel_generation_states_outline 
ON public.novel_generation_states(novel_id, outline_version);

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';

-- Additional cache refresh attempts
SELECT pg_notify('pgrst', 'reload schema');
SELECT pg_notify('supabase_realtime', 'reload schema');
