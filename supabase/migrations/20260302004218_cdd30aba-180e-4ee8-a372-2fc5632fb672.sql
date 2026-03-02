
-- Create strategy_folders table
CREATE TABLE public.strategy_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#666666',
  parent_id uuid REFERENCES public.strategy_folders(id) ON DELETE SET NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.strategy_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own folders"
ON public.strategy_folders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own folders"
ON public.strategy_folders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders"
ON public.strategy_folders FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders"
ON public.strategy_folders FOR DELETE
USING (auth.uid() = user_id);

-- Add folder_id to strategies
ALTER TABLE public.strategies
  ADD COLUMN folder_id uuid REFERENCES public.strategy_folders(id) ON DELETE SET NULL;
