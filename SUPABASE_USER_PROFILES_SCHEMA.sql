-- ==============================================================================
-- Marketing Dashboard v1.5 - Clean Complete user_profiles Setup for Supabase
-- ==============================================================================

-- 1. Create table if not exists with UUID
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'junior',
  allowed_tabs text[] NOT NULL DEFAULT '{}'::text[],
  is_active boolean NOT NULL DEFAULT true,
  team text DEFAULT '',
  default_mode text DEFAULT 'operations',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Add any missing columns safely
DO $$
BEGIN
  ALTER TABLE public.user_profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='allowed_tabs') THEN
    ALTER TABLE public.user_profiles ADD COLUMN allowed_tabs text[] DEFAULT '{}'::text[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='team') THEN
    ALTER TABLE public.user_profiles ADD COLUMN team text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='default_mode') THEN
    ALTER TABLE public.user_profiles ADD COLUMN default_mode text DEFAULT 'operations';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='is_active') THEN
    ALTER TABLE public.user_profiles ADD COLUMN is_active boolean DEFAULT true;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 3. Enable RLS and Policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Profiles" ON public.user_profiles;
CREATE POLICY "Public Read Profiles" ON public.user_profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Full Access Profiles" ON public.user_profiles;
CREATE POLICY "Full Access Profiles" ON public.user_profiles FOR ALL USING (true) WITH CHECK (true);

-- 4. Enable Realtime Publications safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'user_profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profiles;
  END IF;
END $$;

-- 5. Updated_at Trigger (safely checks column)
CREATE OR REPLACE FUNCTION public.set_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    NEW.updated_at = now();
  EXCEPTION
    WHEN OTHERS THEN NULL;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER trigger_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_profiles_updated_at();

-- 6. Insert Default Admin User
DO $$
DECLARE
  v_auth_id uuid;
BEGIN
  SELECT id INTO v_auth_id FROM auth.users WHERE email = 'eslamabdalhamidfb@gmail.com' LIMIT 1;
  IF v_auth_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE email = 'eslamabdalhamidfb@gmail.com' OR id = v_auth_id) THEN
      INSERT INTO public.user_profiles (id, email, name, role, allowed_tabs, is_active, default_mode)
      VALUES (v_auth_id, 'eslamabdalhamidfb@gmail.com', 'eslam', 'admin', ARRAY[]::text[], true, 'operations');
    ELSE
      UPDATE public.user_profiles SET role = 'admin' WHERE id = v_auth_id OR email = 'eslamabdalhamidfb@gmail.com';
    END IF;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE email = 'eslamabdalhamidfb@gmail.com') THEN
      BEGIN
        INSERT INTO public.user_profiles (id, email, name, role, allowed_tabs, is_active, default_mode)
        VALUES (gen_random_uuid(), 'eslamabdalhamidfb@gmail.com', 'eslam', 'admin', ARRAY[]::text[], true, 'operations');
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    ELSE
      UPDATE public.user_profiles SET role = 'admin' WHERE email = 'eslamabdalhamidfb@gmail.com';
    END IF;
  END IF;
END $$;

-- 7. Force Supabase PostgREST Schema Cache Reload (Critical to clear column errors)
NOTIFY pgrst, 'reload schema';
