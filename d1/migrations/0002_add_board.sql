-- Add board/category support (free/promo)
-- Run this once in D1 console if you already created tables from the old schema.

ALTER TABLE posts ADD COLUMN board TEXT NOT NULL DEFAULT 'free';

CREATE INDEX IF NOT EXISTS idx_posts_board_created ON posts(board, created_at DESC);
