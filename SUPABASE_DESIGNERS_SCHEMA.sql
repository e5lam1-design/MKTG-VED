-- Create design_tasks table
CREATE TABLE IF NOT EXISTS public.design_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assigned_date date,
  designer_name text,
  priority text,
  requested_by text,
  design_type text,
  deadline date,
  reference_link text,
  notes text,
  is_done boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Add default_mode to user_profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='default_mode') THEN
    ALTER TABLE public.user_profiles ADD COLUMN default_mode text DEFAULT 'operations';
  END IF;
END $$;

-- Enable RLS on design_tasks
ALTER TABLE public.design_tasks ENABLE ROW LEVEL SECURITY;

-- Policies for design_tasks
DO $$
BEGIN
  -- Select: allowed for authenticated users
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Enable read access for all authenticated users' AND tablename='design_tasks') THEN
    CREATE POLICY "Enable read access for all authenticated users" ON public.design_tasks FOR SELECT TO authenticated USING (true);
  END IF;

  -- Insert/Update/Delete: allowed for authenticated users
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Enable all access for authenticated users' AND tablename='design_tasks') THEN
    CREATE POLICY "Enable all access for authenticated users" ON public.design_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Keep updated_at fresh trigger
DROP TRIGGER IF EXISTS set_design_tasks_updated_at ON public.design_tasks;
CREATE TRIGGER set_design_tasks_updated_at
BEFORE UPDATE ON public.design_tasks
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
