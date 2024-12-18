-- Drop existing tables
DROP TABLE IF EXISTS public.novel_chapters CASCADE;
DROP TABLE IF EXISTS public.temp_novel_data CASCADE;
DROP TABLE IF EXISTS public.novel_generation_states CASCADE;
DROP TABLE IF EXISTS public.novels CASCADE;

-- Create jsonb array helper function
CREATE OR REPLACE FUNCTION public.jsonb_array_set(
    target jsonb,
    path text[],
    value jsonb,
    array_index int DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
    current_array jsonb;
    new_array jsonb;
BEGIN
    IF array_index IS NULL THEN
        RETURN jsonb_deep_set(target, path, value);
    END IF;

    current_array := target #> path;
    IF current_array IS NULL OR jsonb_typeof(current_array) != 'array' THEN
        current_array := '[]'::jsonb;
    END IF;

    -- Ensure array is large enough
    WHILE jsonb_array_length(current_array) <= array_index LOOP
        current_array := current_array || 'null'::jsonb;
    END LOOP;

    -- Set value at index
    new_array := jsonb_set(current_array, ARRAY[array_index::text], value);
    RETURN jsonb_deep_set(target, path, new_array);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create jsonb_deep_set function
CREATE OR REPLACE FUNCTION public.jsonb_deep_set(
    target jsonb,
    path text[],
    value jsonb
)
RETURNS jsonb AS $$
DECLARE
    path_length int;
    current_path text;
    remaining_path text[];
BEGIN
    path_length := array_length(path, 1);
    
    IF path_length IS NULL THEN
        RETURN value;
    END IF;
    
    current_path := path[1];
    
    IF path_length = 1 THEN
        RETURN jsonb_set(target, ARRAY[current_path], value);
    END IF;
    
    remaining_path := path[2:path_length];
    
    IF target->current_path IS NULL THEN
        target := jsonb_set(target, ARRAY[current_path], '{}'::jsonb);
    END IF;
    
    RETURN jsonb_set(
        target,
        ARRAY[current_path],
        jsonb_deep_set(target->current_path, remaining_path, value)
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create the single table structure
CREATE TABLE public.novel_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    parameters JSONB NOT NULL,
    status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'error')) DEFAULT 'pending',
    error_message TEXT,
    content JSONB DEFAULT jsonb_build_object(
        'outline', jsonb_build_object(
            'version', 0,
            'status', 'initial',
            'current', NULL,
            'iterations', jsonb_build_array()
        ),
        'chapters', jsonb_build_array(),
        'metadata', jsonb_build_object(
            'current_chapter', 0,
            'total_chapters', 0,
            'last_updated', NOW()
        )
    ),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_novel_sessions_user_id ON public.novel_sessions(user_id);
CREATE INDEX idx_novel_sessions_status ON public.novel_sessions(status);
CREATE INDEX idx_novel_sessions_content_outline ON public.novel_sessions((content->'outline'->>'version'));

-- Enable RLS
ALTER TABLE public.novel_sessions ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON public.novel_sessions TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.jsonb_deep_set TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.jsonb_array_set TO postgres, anon, authenticated, service_role;

-- Create RLS policies
CREATE POLICY "novel_sessions_select" ON public.novel_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "novel_sessions_insert" ON public.novel_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "novel_sessions_update" ON public.novel_sessions
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "novel_sessions_delete" ON public.novel_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Create function for updating timestamps
CREATE OR REPLACE FUNCTION update_novel_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.content = jsonb_deep_set(
        NEW.content,
        ARRAY['metadata', 'last_updated'],
        to_jsonb(NOW())
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for timestamp updates
CREATE TRIGGER update_novel_sessions_timestamp
    BEFORE UPDATE ON public.novel_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_novel_sessions_updated_at();

-- Create validation functions
CREATE OR REPLACE FUNCTION validate_novel_session_content()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate outline structure
    IF NOT (
        NEW.content ? 'outline' AND
        NEW.content->'outline' ? 'version' AND
        NEW.content->'outline' ? 'status' AND
        NEW.content->'outline' ? 'iterations'
    ) THEN
        RAISE EXCEPTION 'Invalid outline structure in content';
    END IF;

    -- Validate chapters array
    IF NOT (
        NEW.content ? 'chapters' AND
        jsonb_typeof(NEW.content->'chapters') = 'array'
    ) THEN
        RAISE EXCEPTION 'Invalid chapters structure in content';
    END IF;

    -- Validate metadata
    IF NOT (
        NEW.content ? 'metadata' AND
        NEW.content->'metadata' ? 'current_chapter' AND
        NEW.content->'metadata' ? 'total_chapters' AND
        NEW.content->'metadata' ? 'last_updated'
    ) THEN
        RAISE EXCEPTION 'Invalid metadata structure in content';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for content validation
CREATE TRIGGER validate_novel_session_content_trigger
    BEFORE INSERT OR UPDATE ON public.novel_sessions
    FOR EACH ROW
    EXECUTE FUNCTION validate_novel_session_content();

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';
SELECT pg_notify('pgrst', 'reload schema');
SELECT pg_notify('supabase_realtime', 'reload schema'); 