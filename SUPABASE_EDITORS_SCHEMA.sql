-- ==============================================================================
-- جدول إدارة محرري الفيديو (Editors Team Options) - Supabase Schema
-- Table: public.editors_team_options_26
-- ==============================================================================

-- 1. إنشاء جدول المحررين
CREATE TABLE IF NOT EXISTS public.editors_team_options_26 (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  color text DEFAULT '#f43f5e',
  category text DEFAULT 'editor',
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. تفعيل نظام حماية الأسطر (Row Level Security - RLS)
ALTER TABLE public.editors_team_options_26 ENABLE ROW LEVEL SECURITY;

-- 3. سياسات الوصول (Policies): القراءة والكتابة للجميع لسهولة التزامن
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Allow read access for all users' AND tablename='editors_team_options_26') THEN
    CREATE POLICY "Allow read access for all users" 
    ON public.editors_team_options_26 
    FOR SELECT 
    USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Allow all operations for all users' AND tablename='editors_team_options_26') THEN
    CREATE POLICY "Allow all operations for all users" 
    ON public.editors_team_options_26 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);
  END IF;
END $$;

-- 4. تفعيل المزامنة اللحظية (Supabase Realtime)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'editors_team_options_26'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.editors_team_options_26;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 5. إدراج المحررين الافتراضيين مع ألوانهم المميزة المبدئية
INSERT INTO public.editors_team_options_26 (name, color, category, is_active, display_order)
VALUES
  ('Basel', '#f43f5e', 'editor', true, 1),
  ('HASSANEN', '#10b981', 'editor', true, 2),
  ('KIRO', '#3b82f6', 'editor', true, 3),
  ('ABANOUB', '#8b5cf6', 'editor', true, 4),
  ('SHIHAB', '#f59e0b', 'editor', true, 5),
  ('MAGED', '#06b6d4', 'editor', true, 6),
  ('MOHAMED', '#38bdf8', 'editor', true, 7),
  ('ASHRAF', '#a855f7', 'editor', true, 8),
  ('ESLAM', '#14b8a6', 'editor', true, 9),
  ('Ramaj', '#ec4899', 'editor', true, 10),
  ('WAEL', '#eab308', 'editor', true, 11)
ON CONFLICT DO NOTHING;
