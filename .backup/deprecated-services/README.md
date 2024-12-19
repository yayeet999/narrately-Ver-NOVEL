# Deprecated Services Backup

This directory contains backup copies of deprecated services that have been replaced by the new checkpoint-based workflow.

## Files

1. `NovelGenerator.ts`
   - Original location: `src/services/novel/NovelGenerator.ts`
   - Functionality moved to:
     - Individual checkpoint endpoints in `src/pages/api/novel-checkpoints/*`
     - State management in `src/pages/api/novel-checkpoints/shared/state-manager.ts`
     - Content validation in `src/pages/api/novel-checkpoints/shared/content-validator.ts`

2. `generate-novel.ts`
   - Original location: `src/pages/api/generate-novel.ts`
   - Functionality split into:
     - Separate checkpoint endpoints for each generation stage
     - Improved state management and validation
     - Better error handling and progress tracking

3. `CheckpointManager.ts`
   - Original location: `src/services/novel/CheckpointManager.ts`
   - Replaced by:
     - New state manager with improved state transitions
     - Content validator for robust validation
     - Individual checkpoint endpoints for better separation of concerns

## New Workflow Structure

The functionality from these files has been reorganized into:

1. Checkpoint Endpoints:
   - `/novel-checkpoints/outline/*` - Outline generation stages
   - `/novel-checkpoints/chapters/*` - Chapter generation stages

2. Shared Utilities:
   - `state-manager.ts` - State management and transitions
   - `content-validator.ts` - Content validation
   - `types.ts` - Type definitions
   - `validation.ts` - Request validation

## Improvements

The new structure provides:
- Better separation of concerns
- More granular control over the generation process
- Improved error handling and recovery
- Better state management
- More robust content validation
- Progress tracking per stage
- Cleanup of abandoned generations

These files are kept for reference but are no longer part of the active codebase. 