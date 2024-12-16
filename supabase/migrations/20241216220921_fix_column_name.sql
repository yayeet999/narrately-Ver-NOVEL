-- Rename the column to match our code
ALTER TABLE novel_generation_states 
RENAME COLUMN current_chapter TO current_chapt;
