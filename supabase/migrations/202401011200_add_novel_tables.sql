CREATE TABLE IF NOT EXISTS novels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  parameters JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS novel_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id UUID REFERENCES novels(id) ON DELETE CASCADE,
  chapter_number INT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(novel_id, chapter_number)
);

CREATE TABLE IF NOT EXISTS novel_generation_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id UUID REFERENCES novels(id) ON DELETE CASCADE,
  current_chapter INT DEFAULT 0,
  total_chapters INT DEFAULT 0,
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'error')) DEFAULT 'pending',
  error_message TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE novels ENABLE ROW LEVEL SECURITY;
ALTER TABLE novel_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE novel_generation_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "novels_select" ON novels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "novels_insert" ON novels FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "novels_update" ON novels FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "novels_delete" ON novels FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "chapters_select" ON novel_chapters FOR SELECT USING (
 novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
);
CREATE POLICY "chapters_insert" ON novel_chapters FOR INSERT WITH CHECK (
 novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
);
CREATE POLICY "chapters_update" ON novel_chapters FOR UPDATE USING (
 novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
) WITH CHECK (
 novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
);
CREATE POLICY "chapters_delete" ON novel_chapters FOR DELETE USING (
 novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
);

CREATE POLICY "state_select" ON novel_generation_states FOR SELECT USING (
 novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
);
CREATE POLICY "state_insert" ON novel_generation_states FOR INSERT WITH CHECK (
 novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
);
CREATE POLICY "state_update" ON novel_generation_states FOR UPDATE USING (
 novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
) WITH CHECK (
 novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
);
CREATE POLICY "state_delete" ON novel_generation_states FOR DELETE USING (
 novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
); 