
-- Create portfolios table
CREATE TABLE public.portfolios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own portfolios" ON public.portfolios FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own portfolios" ON public.portfolios FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own portfolios" ON public.portfolios FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own portfolios" ON public.portfolios FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_portfolios_updated_at
  BEFORE UPDATE ON public.portfolios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Create portfolio_strategies junction table
CREATE TABLE public.portfolio_strategies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  strategy_id UUID NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
  weight NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(portfolio_id, strategy_id)
);

ALTER TABLE public.portfolio_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own portfolio strategies" ON public.portfolio_strategies FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.portfolios WHERE portfolios.id = portfolio_strategies.portfolio_id AND portfolios.user_id = auth.uid()));
CREATE POLICY "Users can insert own portfolio strategies" ON public.portfolio_strategies FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.portfolios WHERE portfolios.id = portfolio_strategies.portfolio_id AND portfolios.user_id = auth.uid()));
CREATE POLICY "Users can update own portfolio strategies" ON public.portfolio_strategies FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.portfolios WHERE portfolios.id = portfolio_strategies.portfolio_id AND portfolios.user_id = auth.uid()));
CREATE POLICY "Users can delete own portfolio strategies" ON public.portfolio_strategies FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.portfolios WHERE portfolios.id = portfolio_strategies.portfolio_id AND portfolios.user_id = auth.uid()));
