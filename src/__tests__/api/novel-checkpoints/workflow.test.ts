import { SupabaseClient } from '@supabase/supabase-js';
import { NovelData } from '../../../pages/api/novel-checkpoints/shared/types';
import { ContentValidator } from '../../../pages/api/novel-checkpoints/shared/content-validator';
import { NovelStateManager } from '../../../pages/api/novel-checkpoints/shared/state-manager';
import {
  createTestSupabaseClient,
  createTestNovel,
  cleanupTestNovel,
  getNovelState,
  validateNovelState,
  waitForNovelStatus,
  TEST_NOVEL_PARAMETERS
} from './test-utils';

describe('Novel Generation Workflow', () => {
  let supabase: SupabaseClient;
  let novelId: string;
  let stateManager: NovelStateManager;

  beforeAll(async () => {
    supabase = createTestSupabaseClient();
  });

  beforeEach(async () => {
    novelId = await createTestNovel(supabase);
    stateManager = new NovelStateManager(supabase, novelId);
  });

  afterEach(async () => {
    await cleanupTestNovel(supabase, novelId);
  });

  describe('Outline Generation', () => {
    test('Initial outline generation', async () => {
      // Test initial outline generation
      const response = await fetch('/api/novel-checkpoints/outline/initial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          user_id: 'test-user',
          novelId,
          parameters: TEST_NOVEL_PARAMETERS
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);

      // Verify novel state
      const novel = await getNovelState(supabase, novelId);
      expect(novel.outline_status).toBe('initial');
      expect(novel.outline_data.current).toBeTruthy();
      
      // Validate outline content
      const validation = ContentValidator.validateOutline(novel.outline_data.current);
      expect(validation.isValid).toBe(true);
    });

    test('Complete outline workflow', async () => {
      // Initial outline
      await fetch('/api/novel-checkpoints/outline/initial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          user_id: 'test-user',
          novelId,
          parameters: TEST_NOVEL_PARAMETERS
        })
      });

      // First revision
      await fetch('/api/novel-checkpoints/outline/revision-one', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          user_id: 'test-user',
          novelId,
          parameters: TEST_NOVEL_PARAMETERS
        })
      });

      // Second revision
      await fetch('/api/novel-checkpoints/outline/revision-two', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          user_id: 'test-user',
          novelId,
          parameters: TEST_NOVEL_PARAMETERS
        })
      });

      // Finalize outline
      await fetch('/api/novel-checkpoints/outline/finalize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          user_id: 'test-user',
          novelId,
          parameters: TEST_NOVEL_PARAMETERS
        })
      });

      // Verify final state
      const novel = await waitForNovelStatus(supabase, novelId, 'outline_completed');
      expect(novel.outline_status).toBe('completed');
      expect(novel.outline_version).toBe(3);
      expect(novel.total_chapters).toBeGreaterThanOrEqual(10);
      expect(novel.total_chapters).toBeLessThanOrEqual(150);
    });
  });

  describe('Chapter Generation', () => {
    let novel: NovelData;

    beforeEach(async () => {
      // Setup completed outline
      await fetch('/api/novel-checkpoints/outline/initial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          user_id: 'test-user',
          novelId,
          parameters: TEST_NOVEL_PARAMETERS
        })
      });

      await fetch('/api/novel-checkpoints/outline/finalize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          user_id: 'test-user',
          novelId,
          parameters: TEST_NOVEL_PARAMETERS
        })
      });

      novel = await waitForNovelStatus(supabase, novelId, 'outline_completed');
    });

    test('Initial chapter generation', async () => {
      const response = await fetch('/api/novel-checkpoints/chapters/initial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          user_id: 'test-user',
          novelId,
          parameters: TEST_NOVEL_PARAMETERS
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);

      // Verify chapter state
      const updatedNovel = await getNovelState(supabase, novelId);
      expect(updatedNovel.current_chapter).toBe(1);
      expect(updatedNovel.chapters_data.chapters).toHaveLength(1);
      
      const chapter = updatedNovel.chapters_data.chapters[0];
      expect(chapter.status).toBe('initial');
      expect(chapter.version).toBe(0);
      
      // Validate chapter content
      const validation = ContentValidator.validateChapter(chapter.content);
      expect(validation.isValid).toBe(true);
    });

    test('Complete chapter workflow', async () => {
      // Initial generation
      await fetch('/api/novel-checkpoints/chapters/initial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          user_id: 'test-user',
          novelId,
          parameters: TEST_NOVEL_PARAMETERS
        })
      });

      // First revision
      await fetch('/api/novel-checkpoints/chapters/revision-one', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          user_id: 'test-user',
          novelId,
          parameters: TEST_NOVEL_PARAMETERS
        })
      });

      // Second revision
      await fetch('/api/novel-checkpoints/chapters/revision-two', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          user_id: 'test-user',
          novelId,
          parameters: TEST_NOVEL_PARAMETERS
        })
      });

      // Finalize chapter
      await fetch('/api/novel-checkpoints/chapters/finalize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          user_id: 'test-user',
          novelId,
          parameters: TEST_NOVEL_PARAMETERS
        })
      });

      // Verify final state
      const updatedNovel = await getNovelState(supabase, novelId);
      const chapter = updatedNovel.chapters_data.chapters[0];
      expect(chapter.status).toBe('completed');
      expect(chapter.version).toBe(3);
    });
  });

  describe('Error Handling', () => {
    test('Handles invalid novel ID', async () => {
      const response = await fetch('/api/novel-checkpoints/outline/initial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          user_id: 'test-user',
          novelId: 'invalid-id',
          parameters: TEST_NOVEL_PARAMETERS
        })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeTruthy();
    });

    test('Handles invalid state transitions', async () => {
      // Try to finalize outline without previous steps
      const response = await fetch('/api/novel-checkpoints/outline/finalize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          user_id: 'test-user',
          novelId,
          parameters: TEST_NOVEL_PARAMETERS
        })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('incorrect status');
    });
  });

  describe('State Management', () => {
    test('Tracks progress correctly', async () => {
      const progress = await stateManager.getProgressState();
      expect(progress.currentStep).toBe(0);
      expect(progress.totalSteps).toBe(1);
      expect(progress.stage).toBe('initializing');
    });

    test('Handles abandoned generations', async () => {
      await stateManager.cleanupAbandonedGeneration(0);
      const novel = await getNovelState(supabase, novelId);
      expect(novel.novel_status).toBe('error');
      expect(novel.error).toContain('abandoned');
    });
  });
}); 