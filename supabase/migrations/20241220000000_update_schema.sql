-- Drop existing objects
DROP TABLE IF EXISTS public.novels CASCADE;
DROP TYPE IF EXISTS public.novel_status CASCADE;
DROP TYPE IF EXISTS public.outline_status CASCADE;
DROP TYPE IF EXISTS public.chapter_status CASCADE;
DROP TYPE IF EXISTS public.novel_length CASCADE;
DROP TYPE IF EXISTS public.pov_type CASCADE;
DROP TYPE IF EXISTS public.sentence_structure CASCADE;
DROP TYPE IF EXISTS public.paragraph_length CASCADE;
DROP TYPE IF EXISTS public.controversial_handling CASCADE;
DROP TYPE IF EXISTS public.outline_status_enum CASCADE;

-- Create custom types
CREATE TYPE novel_status AS ENUM (
    'initializing',
    'outline_in_progress',
    'outline_completed',
    'in_progress',
    'completed',
    'error'
);

CREATE TYPE outline_status AS ENUM (
    'initial',
    'pass1',
    'pass2',
    'completed'
);

CREATE TYPE chapter_status AS ENUM (
    'initial',
    'revision_one',
    'revision_two',
    'completed'
);

CREATE TYPE novel_length AS ENUM (
    '50k-100k',
    '100k-150k',
    '150k+'
);

CREATE TYPE pov_type AS ENUM (
    'first',
    'third_limited',
    'third_omniscient',
    'multiple'
);

CREATE TYPE sentence_structure AS ENUM (
    'varied',
    'consistent',
    'simple',
    'complex'
);

CREATE TYPE paragraph_length AS ENUM (
    'short',
    'medium',
    'long'
);

CREATE TYPE controversial_handling AS ENUM (
    'avoid',
    'careful',
    'direct'
);

-- Create the novels table
CREATE TABLE novels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    parameters JSONB NOT NULL,
    novel_status novel_status NOT NULL DEFAULT 'initializing',
    outline_status outline_status NOT NULL DEFAULT 'initial',
    outline_version INTEGER NOT NULL DEFAULT 0,
    outline_data JSONB NOT NULL DEFAULT '{"current": null, "iterations": []}'::JSONB,
    current_chapter INTEGER NOT NULL DEFAULT 0,
    total_chapters INTEGER NOT NULL DEFAULT 0,
    chapters_data JSONB NOT NULL DEFAULT '{"chapters": []}'::JSONB,
    processed_metrics JSONB,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT valid_outline_data CHECK (
        jsonb_typeof(outline_data->'current') IN ('string', 'null') AND
        jsonb_typeof(outline_data->'iterations') = 'array'
    ),
    CONSTRAINT valid_chapters_data CHECK (
        jsonb_typeof(chapters_data->'chapters') = 'array'
    ),
    CONSTRAINT valid_total_chapters CHECK (
        total_chapters >= 0 AND total_chapters <= 150
    ),
    CONSTRAINT valid_current_chapter CHECK (
        current_chapter >= 0 AND current_chapter <= total_chapters
    ),
    CONSTRAINT valid_parameters CHECK (
        jsonb_typeof(parameters) = 'object' AND
        (parameters->>'title') IS NOT NULL AND
        (parameters->>'primary_genre') IS NOT NULL AND
        (parameters->>'primary_theme') IS NOT NULL AND
        jsonb_typeof(parameters->'characters') = 'array' AND
        jsonb_array_length(parameters->'characters') > 0
    ),
    CONSTRAINT valid_processed_metrics CHECK (
        processed_metrics IS NULL OR (
            jsonb_typeof(processed_metrics) = 'object' AND
            (processed_metrics->>'storyWeight') IS NOT NULL AND
            (processed_metrics->>'recommendedChapters') IS NOT NULL AND
            jsonb_typeof(processed_metrics->'subplotDistribution') = 'array' AND
            jsonb_typeof(processed_metrics->'characterGuidance') = 'array' AND
            jsonb_typeof(processed_metrics->'chapterGuidance') = 'array'
        )
    )
);

-- Create indexes
CREATE INDEX idx_novels_user_id ON novels(user_id);
CREATE INDEX idx_novels_status ON novels(novel_status);
CREATE INDEX idx_novels_updated_at ON novels(updated_at);
CREATE INDEX idx_novels_title ON novels(title);
CREATE INDEX idx_novels_created_at ON novels(created_at);

-- Create helper functions
CREATE OR REPLACE FUNCTION jsonb_deep_set(
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

CREATE OR REPLACE FUNCTION jsonb_array_set(
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

    WHILE jsonb_array_length(current_array) <= array_index LOOP
        current_array := current_array || 'null'::jsonb;
    END LOOP;

    new_array := jsonb_set(current_array, ARRAY[array_index::text], value);
    RETURN jsonb_deep_set(target, path, new_array);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create validation functions
CREATE OR REPLACE FUNCTION validate_chapter_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate chapter structure
    IF NOT (
        NEW.chapters_data->>'chapters' IS NULL OR
        jsonb_typeof(NEW.chapters_data->'chapters') = 'array'
    ) THEN
        RAISE EXCEPTION 'Invalid chapters data structure';
    END IF;

    -- Validate each chapter
    IF jsonb_array_length(NEW.chapters_data->'chapters') > 0 THEN
        FOR i IN 0..jsonb_array_length(NEW.chapters_data->'chapters')-1 LOOP
            IF NOT (
                (NEW.chapters_data->'chapters'->i->>'chapter_number')::int IS NOT NULL AND
                NEW.chapters_data->'chapters'->i->>'content' IS NOT NULL AND
                NEW.chapters_data->'chapters'->i->>'version' IS NOT NULL AND
                NEW.chapters_data->'chapters'->i->>'status' IS NOT NULL AND
                NEW.chapters_data->'chapters'->i->>'timestamp' IS NOT NULL AND
                length(NEW.chapters_data->'chapters'->i->>'content') >= 1000 AND
                length(NEW.chapters_data->'chapters'->i->>'content') <= 4000
            ) THEN
                RAISE EXCEPTION 'Invalid chapter structure or content length at index %', i;
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_outline_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate outline structure
    IF NOT (
        NEW.outline_data->>'current' IS NULL OR
        jsonb_typeof(NEW.outline_data->'current') = 'string'
    ) THEN
        RAISE EXCEPTION 'Invalid outline current data structure';
    END IF;

    IF NOT jsonb_typeof(NEW.outline_data->'iterations') = 'array' THEN
        RAISE EXCEPTION 'Invalid outline iterations structure';
    END IF;

    -- Validate each iteration
    IF jsonb_array_length(NEW.outline_data->'iterations') > 0 THEN
        FOR i IN 0..jsonb_array_length(NEW.outline_data->'iterations')-1 LOOP
            IF NOT (
                NEW.outline_data->'iterations'->i->>'content' IS NOT NULL AND
                NEW.outline_data->'iterations'->i->>'timestamp' IS NOT NULL AND
                length(NEW.outline_data->'iterations'->i->>'content') >= 1000 AND
                length(NEW.outline_data->'iterations'->i->>'content') <= 10000
            ) THEN
                RAISE EXCEPTION 'Invalid outline iteration structure or content length at index %', i;
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_processed_metrics()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.processed_metrics IS NOT NULL THEN
        -- Validate story weight is a number between 0 and 10
        IF NOT (
            (NEW.processed_metrics->>'storyWeight')::numeric >= 0 AND
            (NEW.processed_metrics->>'storyWeight')::numeric <= 10
        ) THEN
            RAISE EXCEPTION 'Invalid story weight value';
        END IF;

        -- Validate recommended chapters is within bounds
        IF NOT (
            (NEW.processed_metrics->>'recommendedChapters')::int >= 10 AND
            (NEW.processed_metrics->>'recommendedChapters')::int <= 150
        ) THEN
            RAISE EXCEPTION 'Invalid recommended chapters value';
        END IF;

        -- Validate subplot distribution
        IF NOT (
            jsonb_typeof(NEW.processed_metrics->'subplotDistribution') = 'array' AND
            jsonb_array_length(NEW.processed_metrics->'subplotDistribution') > 0
        ) THEN
            RAISE EXCEPTION 'Invalid subplot distribution structure';
        END IF;

        -- Validate character guidance
        IF NOT (
            jsonb_typeof(NEW.processed_metrics->'characterGuidance') = 'array' AND
            jsonb_array_length(NEW.processed_metrics->'characterGuidance') > 0
        ) THEN
            RAISE EXCEPTION 'Invalid character guidance structure';
        END IF;

        -- Validate chapter guidance
        IF NOT (
            jsonb_typeof(NEW.processed_metrics->'chapterGuidance') = 'array' AND
            jsonb_array_length(NEW.processed_metrics->'chapterGuidance') > 0
        ) THEN
            RAISE EXCEPTION 'Invalid chapter guidance structure';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER validate_chapters_data
    BEFORE INSERT OR UPDATE ON novels
    FOR EACH ROW
    EXECUTE FUNCTION validate_chapter_data();

CREATE TRIGGER validate_outline_data
    BEFORE INSERT OR UPDATE ON novels
    FOR EACH ROW
    EXECUTE FUNCTION validate_outline_data();

CREATE TRIGGER validate_processed_metrics
    BEFORE INSERT OR UPDATE ON novels
    FOR EACH ROW
    EXECUTE FUNCTION validate_processed_metrics();

-- Create RLS policies
ALTER TABLE novels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own novels"
    ON novels FOR SELECT
    USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own novels"
    ON novels FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own novels"
    ON novels FOR UPDATE
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own novels"
    ON novels FOR DELETE
    USING (auth.uid()::text = user_id);

-- Create utility functions
CREATE OR REPLACE FUNCTION cleanup_abandoned_generations(timeout_minutes INTEGER DEFAULT 60)
RETURNS void AS $$
BEGIN
    UPDATE novels
    SET 
        novel_status = 'error',
        error = 'Generation abandoned due to timeout',
        updated_at = TIMEZONE('utc', NOW())
    WHERE
        updated_at < TIMEZONE('utc', NOW()) - (timeout_minutes || ' minutes')::INTERVAL
        AND novel_status NOT IN ('completed', 'error');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_novel_progress(novel_id UUID)
RETURNS TABLE (
    current_step INTEGER,
    total_steps INTEGER,
    progress_percentage NUMERIC,
    current_stage TEXT,
    error_message TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE
            WHEN n.novel_status = 'initializing' THEN 0
            WHEN n.novel_status = 'outline_in_progress' THEN 
                CASE n.outline_status
                    WHEN 'initial' THEN 1
                    WHEN 'pass1' THEN 2
                    WHEN 'pass2' THEN 3
                    WHEN 'completed' THEN 4
                    ELSE 0
                END
            ELSE n.current_chapter * 4
        END AS current_step,
        CASE
            WHEN n.novel_status = 'initializing' THEN 1
            WHEN n.novel_status = 'outline_in_progress' THEN 4
            ELSE n.total_chapters * 4
        END AS total_steps,
        CASE
            WHEN n.novel_status = 'completed' THEN 100
            WHEN n.total_chapters = 0 THEN 0
            ELSE (n.current_chapter::numeric / n.total_chapters::numeric) * 100
        END AS progress_percentage,
        n.novel_status::TEXT AS current_stage,
        n.error AS error_message
    FROM novels n
    WHERE n.id = novel_id;
END;
$$ LANGUAGE plpgsql; 