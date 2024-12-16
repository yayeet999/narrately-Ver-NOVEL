-- Create the novels table first
CREATE TABLE IF NOT EXISTS novels (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    title text,
    parameters jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Drop the existing table if it exists
DROP TABLE IF EXISTS novel_generation_states;

-- Create the novel_generation_states table
CREATE TABLE novel_generation_states (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    novel_id uuid REFERENCES novels(id) ON DELETE CASCADE,
    current_chapt int4 DEFAULT 0,
    total_chapters int4 DEFAULT 0,
    status text DEFAULT 'pending'::text,
    error_message text DEFAULT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);
