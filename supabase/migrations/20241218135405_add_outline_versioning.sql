-- Add outline versioning columns to novel_generation_states
ALTER TABLE novel_generation_states
ADD COLUMN IF NOT EXISTS outline_version INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS outline_status TEXT CHECK (outline_status IN ('initial', 'pass1', 'pass2', 'completed')) DEFAULT 'initial';

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_novel_generation_states_outline 
ON novel_generation_states(novel_id, outline_version);

-- Modify temp_novel_data constraints for outline versioning
DO $$ 
BEGIN
    -- Drop the existing constraint if it exists
    ALTER TABLE temp_novel_data
    DROP CONSTRAINT IF EXISTS temp_novel_data_novel_id_data_type_key;
EXCEPTION
    WHEN undefined_object THEN
        NULL;
END $$;

-- Create new indices for versioned outlines and other data
CREATE UNIQUE INDEX IF NOT EXISTS idx_temp_novel_data_outline_version 
ON temp_novel_data(novel_id, data_type, (metadata->>'version'))
WHERE data_type LIKE 'outline_v%';

CREATE UNIQUE INDEX IF NOT EXISTS idx_temp_novel_data_other
ON temp_novel_data(novel_id, data_type)
WHERE data_type NOT LIKE 'outline_v%';

-- Add trigger to update novel_generation_states.outline_version when temp_novel_data is updated
CREATE OR REPLACE FUNCTION update_outline_version()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.data_type LIKE 'outline_v%' THEN
        UPDATE novel_generation_states
        SET outline_version = (NEW.metadata->>'version')::int,
            outline_status = CASE (NEW.metadata->>'version')::int
                WHEN 0 THEN 'initial'
                WHEN 1 THEN 'pass1'
                WHEN 2 THEN 'pass2'
                WHEN 3 THEN 'completed'
                ELSE outline_status
            END
        WHERE novel_id = NEW.novel_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_outline_version ON temp_novel_data;
CREATE TRIGGER trigger_update_outline_version
    AFTER INSERT OR UPDATE ON temp_novel_data
    FOR EACH ROW
    EXECUTE FUNCTION update_outline_version();
