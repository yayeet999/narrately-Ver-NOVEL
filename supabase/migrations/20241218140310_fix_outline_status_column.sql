-- Drop existing outline_status column if it exists (to avoid conflicts)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'novel_generation_states' 
        AND column_name = 'outline_status'
    ) THEN
        ALTER TABLE public.novel_generation_states DROP COLUMN outline_status;
    END IF;
END $$;

-- Add outline_status column with proper type and constraints
ALTER TABLE public.novel_generation_states
ADD COLUMN outline_status TEXT;

-- Create enum type for outline status if it doesn't exist
DO $$ 
BEGIN
    ALTER TABLE public.novel_generation_states
    ADD CONSTRAINT outline_status_check 
    CHECK (outline_status IN ('initial', 'pass1', 'pass2', 'completed'));
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
END $$;

-- Set default value
ALTER TABLE public.novel_generation_states
ALTER COLUMN outline_status SET DEFAULT 'initial';

-- Update existing rows to have the default value
UPDATE public.novel_generation_states
SET outline_status = 'initial'
WHERE outline_status IS NULL;

-- Make the column NOT NULL after setting defaults
ALTER TABLE public.novel_generation_states
ALTER COLUMN outline_status SET NOT NULL;

-- Notify Supabase to refresh schema cache
NOTIFY pgrst, 'reload schema';
