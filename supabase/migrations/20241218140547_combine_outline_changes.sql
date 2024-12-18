-- Ensure the columns exist with proper types
DO $$ 
BEGIN
    -- Add outline_version if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'novel_generation_states' 
        AND column_name = 'outline_version'
    ) THEN
        ALTER TABLE public.novel_generation_states
        ADD COLUMN outline_version INT DEFAULT 0;
    END IF;

    -- Add outline_status if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'novel_generation_states' 
        AND column_name = 'outline_status'
    ) THEN
        ALTER TABLE public.novel_generation_states
        ADD COLUMN outline_status TEXT DEFAULT 'initial';
    END IF;
END $$;

-- Drop existing constraint if it exists
DO $$ 
BEGIN
    ALTER TABLE public.novel_generation_states
    DROP CONSTRAINT IF EXISTS outline_status_check;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Add the constraint fresh
ALTER TABLE public.novel_generation_states
ADD CONSTRAINT outline_status_check 
CHECK (outline_status IN ('initial', 'pass1', 'pass2', 'completed'));

-- Update any null values
UPDATE public.novel_generation_states
SET outline_status = 'initial'
WHERE outline_status IS NULL;

-- Make columns NOT NULL
ALTER TABLE public.novel_generation_states
ALTER COLUMN outline_status SET NOT NULL,
ALTER COLUMN outline_version SET NOT NULL;

-- Recreate the index
DROP INDEX IF EXISTS idx_novel_generation_states_outline;
CREATE INDEX idx_novel_generation_states_outline 
ON public.novel_generation_states(novel_id, outline_version);

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';
