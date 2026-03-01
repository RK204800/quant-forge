
-- Add new columns to strategies table
ALTER TABLE public.strategies ADD COLUMN IF NOT EXISTS strategy_class TEXT;
ALTER TABLE public.strategies ADD COLUMN IF NOT EXISTS parameters JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.strategies ADD COLUMN IF NOT EXISTS parameter_template JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.strategies ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;

-- Create strategy_tags table
CREATE TABLE IF NOT EXISTS public.strategy_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#666666',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.strategy_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tags" ON public.strategy_tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tags" ON public.strategy_tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tags" ON public.strategy_tags FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tags" ON public.strategy_tags FOR DELETE USING (auth.uid() = user_id);

-- Create strategy_tag_mapping junction table
CREATE TABLE IF NOT EXISTS public.strategy_tag_mapping (
  strategy_id UUID REFERENCES public.strategies(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.strategy_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (strategy_id, tag_id)
);
ALTER TABLE public.strategy_tag_mapping ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tag mappings" ON public.strategy_tag_mapping FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.strategies WHERE id = strategy_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert own tag mappings" ON public.strategy_tag_mapping FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.strategies WHERE id = strategy_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own tag mappings" ON public.strategy_tag_mapping FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.strategies WHERE id = strategy_id AND user_id = auth.uid()));
