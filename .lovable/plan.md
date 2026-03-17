

## Give the Chatbot Full Awareness of All Strategies and Portfolios

### Problem
Currently the chatbot only knows about a single strategy (the one on the current page). It has no awareness of the user's other strategies or any portfolios, so it can't compare strategies, reference them by name, or analyze portfolio composition.

### Solution

**1. Build a global context summary** — new function `buildGlobalContext` in `src/lib/strategy-context.ts`

Fetches from the `useStrategies` and `usePortfolios` hooks (already cached by React Query) and produces a compact inventory:
- List of all strategies with key metrics (name, total return, Sharpe, win rate, trade count, asset class, status)
- List of all portfolios with their member strategies and weights
- This is always sent to the AI so it knows the full picture

Keep it concise — one line per strategy, one block per portfolio. No full trade-level detail (that stays in the per-strategy deep context).

**2. Update `StrategyChatbot.tsx`**

- Import `useStrategies` and `usePortfolios` hooks
- Call `buildGlobalContext(strategies, portfolios)` to create an "inventory" context string
- Also detect if on a portfolio page (`/portfolio/:id`) and build detailed context for that portfolio's combined trades
- Send both `globalContext` (inventory) and `strategyContext` (deep detail for current strategy/portfolio) to the edge function

**3. Add `buildPortfolioContext` to `src/lib/strategy-context.ts`**

Similar to `buildStrategyContext` but for a portfolio — aggregates trades from all member strategies, computes combined metrics, shows per-strategy contribution and weights.

**4. Update edge function `supabase/functions/strategy-advisor/index.ts`**

- Accept new `globalContext` field alongside existing `strategyContext`
- Inject as a separate system message: "Here is the user's complete strategy and portfolio inventory..."
- Update system prompt to mention the AI can reference any strategy or portfolio by name

### Files Modified
- `src/lib/strategy-context.ts` — add `buildGlobalContext()` and `buildPortfolioContext()`
- `src/components/chat/StrategyChatbot.tsx` — load all strategies/portfolios, detect portfolio pages, send global context
- `supabase/functions/strategy-advisor/index.ts` — accept and inject `globalContext`

