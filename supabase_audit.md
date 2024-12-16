# SUPABASE DATABASE AUDIT
*Generated on: [Current Date]*

## Table of Contents
1. [Novels Table](#1-novels-table)
2. [Novel Chapters Table](#2-novel_chapters-table)
3. [Novel Generation States Table](#3-novel_generation_states-table)
4. [Temporary Novel Data Table](#4-temp_novel_data-table)
5. [Global Security Features](#global-security-features)
6. [Database Best Practices](#database-best-practices)

## 1. Novels Table
### Schema
```sql
CREATE TABLE novels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  parameters JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Constraints
- Primary Key: `id` (UUID)
- Foreign Key: `user_id` references `auth.users(id)` with CASCADE deletion
- NOT NULL: `title`, `parameters`

### Indexes
- Primary Key index on `id`
- Foreign Key index on `user_id`

### RLS Policies
```sql
-- Select Policy
CREATE POLICY "novels_select" ON novels 
  FOR SELECT USING (auth.uid() = user_id);

-- Insert Policy
CREATE POLICY "novels_insert" ON novels 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Update Policy
CREATE POLICY "novels_update" ON novels 
  FOR UPDATE USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- Delete Policy
CREATE POLICY "novels_delete" ON novels 
  FOR DELETE USING (auth.uid() = user_id);
```

## 2. Novel_Chapters Table
### Schema
```sql
CREATE TABLE novel_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id UUID REFERENCES novels(id) ON DELETE CASCADE,
  chapter_number INT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(novel_id, chapter_number)
);
```

### Constraints
- Primary Key: `id` (UUID)
- Foreign Key: `novel_id` references `novels(id)` with CASCADE deletion
- Unique Constraint: `(novel_id, chapter_number)` combination must be unique
- NOT NULL: `chapter_number`, `content`

### Indexes
- Primary Key index on `id`
- Foreign Key index on `novel_id`
- Unique index on `(novel_id, chapter_number)`

### RLS Policies
```sql
-- Select Policy
CREATE POLICY "chapters_select" ON novel_chapters 
  FOR SELECT USING (
    novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
  );

-- Insert Policy
CREATE POLICY "chapters_insert" ON novel_chapters 
  FOR INSERT WITH CHECK (
    novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
  );

-- Update Policy
CREATE POLICY "chapters_update" ON novel_chapters 
  FOR UPDATE USING (
    novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
  ) WITH CHECK (
    novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
  );

-- Delete Policy
CREATE POLICY "chapters_delete" ON novel_chapters 
  FOR DELETE USING (
    novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
  );
```

## 3. Novel_Generation_States Table
### Schema
```sql
CREATE TABLE novel_generation_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id UUID REFERENCES novels(id) ON DELETE CASCADE,
  current_chapt INT DEFAULT 0,
  total_chapters INT DEFAULT 0,
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'error')) DEFAULT 'pending',
  error_message TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Constraints
- Primary Key: `id` (UUID)
- Foreign Key: `novel_id` references `novels(id)` with CASCADE deletion
- Check Constraint: `status` must be one of: 'pending', 'in_progress', 'completed', 'error'
- Default Values:
  - `current_chapt` = 0
  - `total_chapters` = 0
  - `status` = 'pending'

### Indexes
- Primary Key index on `id`
- Foreign Key index on `novel_id`

### RLS Policies
```sql
-- Select Policy
CREATE POLICY "state_select" ON novel_generation_states 
  FOR SELECT USING (
    novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
  );

-- Insert Policy
CREATE POLICY "state_insert" ON novel_generation_states 
  FOR INSERT WITH CHECK (
    novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
  );

-- Update Policy
CREATE POLICY "state_update" ON novel_generation_states 
  FOR UPDATE USING (
    novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
  ) WITH CHECK (
    novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
  );

-- Delete Policy
CREATE POLICY "state_delete" ON novel_generation_states 
  FOR DELETE USING (
    novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
  );
```

## 4. Temp_Novel_Data Table
### Schema
```sql
CREATE TABLE temp_novel_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id UUID REFERENCES novels(id) ON DELETE CASCADE,
  data_type TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(novel_id, data_type)
);
```

### Constraints
- Primary Key: `id` (UUID)
- Foreign Key: `novel_id` references `novels(id)` with CASCADE deletion
- Unique Constraint: `(novel_id, data_type)` combination must be unique
- NOT NULL: `data_type`, `content`
- Default Values:
  - `metadata` = '{}'

### Indexes
- Primary Key index on `id`
- Foreign Key index on `novel_id`
- Unique index on `(novel_id, data_type)`

### RLS Policies
```sql
-- Select Policy
CREATE POLICY "temp_data_select" ON temp_novel_data 
  FOR SELECT USING (
    novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
  );

-- Insert Policy
CREATE POLICY "temp_data_insert" ON temp_novel_data 
  FOR INSERT WITH CHECK (
    novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
  );

-- Update Policy
CREATE POLICY "temp_data_update" ON temp_novel_data 
  FOR UPDATE USING (
    novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
  ) WITH CHECK (
    novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
  );

-- Delete Policy
CREATE POLICY "temp_data_delete" ON temp_novel_data 
  FOR DELETE USING (
    novel_id IN (SELECT id FROM novels WHERE user_id = auth.uid())
  );
```

## Global Security Features
1. Row Level Security (RLS)
   - Enabled on all tables
   - No public access without authentication
   - All access controlled through user authentication

2. Data Protection
   - UUID used for all primary keys
   - CASCADE deletion for referential integrity
   - Timestamp tracking on all tables

3. Access Control
   - All tables require authentication
   - Users can only access their own data
   - Nested ownership checks through novel_id relationships

## Database Best Practices
1. Data Integrity
   - Proper foreign key constraints
   - Consistent use of NOT NULL constraints
   - Check constraints for enumerated values
   - Unique constraints where appropriate

2. Performance Optimization
   - Indexes on lookup columns
   - JSONB for flexible data storage
   - Proper data type selection
   - Efficient relationship design

3. Security Implementation
   - Row Level Security on all tables
   - No public access without authentication
   - Proper permission granularity
   - Secure default values

4. Maintainability
   - Consistent naming conventions
   - Clear table relationships
   - Proper use of timestamps
   - Well-structured constraints

---
*Note: This audit represents the database schema as of the latest migration. Always refer to the actual database for the most up-to-date information.* 