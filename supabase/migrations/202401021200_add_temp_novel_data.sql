-- Drop existing policies if they exist
DROP POLICY IF EXISTS "temp_data_select" ON temp_novel_data;
DROP POLICY IF EXISTS "temp_data_insert" ON temp_novel_data;
DROP POLICY IF EXISTS "temp_data_update" ON temp_novel_data;
DROP POLICY IF EXISTS "temp_data_delete" ON temp_novel_data;

CREATE TABLE IF NOT EXISTS temp_novel_data (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 novel_id UUID REFERENCES novels(id) ON DELETE CASCADE,
 data_type TEXT NOT NULL,
 content TEXT NOT NULL,
 metadata JSONB DEFAULT '{}',
 created_at TIMESTAMPTZ DEFAULT NOW(),
 UNIQUE(novel_id, data_type)
);

ALTER TABLE temp_novel_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "temp_data_select" ON temp_novel_data FOR SELECT USING (
 novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
);

CREATE POLICY "temp_data_insert" ON temp_novel_data FOR INSERT WITH CHECK (
 novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
);

CREATE POLICY "temp_data_update" ON temp_novel_data FOR UPDATE USING (
 novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
) WITH CHECK (
 novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
);

CREATE POLICY "temp_data_delete" ON temp_novel_data FOR DELETE USING (
 novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
); 