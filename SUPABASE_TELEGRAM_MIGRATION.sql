-- ==============================================================================
-- Telegram Integration Migration for Supabase
-- ==============================================================================

-- 1. Add telegram_chat_id column to user_profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='user_profiles' AND column_name='telegram_chat_id'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN telegram_chat_id text DEFAULT '';
  END IF;
END $$;

-- 2. Reload PostgREST schema cache so the column is immediately accessible
NOTIFY pgrst, 'reload schema';
