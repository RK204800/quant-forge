
Goal: make every equity curve consistently start at $0 (immediately in UI and persistently in database), including older strategies already stored with a ~$100k baseline.

What I found
- The parser layer already generates $0-based curves for new uploads.
- The “Recompute Equity” action exists, but most existing strategies still have first equity point = 100000 in stored data.
- Database evidence confirms mixed baselines:
  - Some strategies start at 0
  - Others still start at 100000
- A subtle recompute bug can still cause charts to appear to start above $0:
  - `useRecomputeEquity` seeds the initial point at `trades[0].exit_time`
  - Then it also adds the first trade result at the same timestamp
  - With duplicate timestamps, ordering can make the non-zero point render first.

Implementation approach
1) Fix recompute logic so first point is unambiguously $0
- File: `src/hooks/use-strategies.ts` (`useRecomputeEquity`)
- Changes:
  - Sort trades deterministically by `entry_time`, then `exit_time`, then `id` (stable sequence).
  - Seed initial equity point at earliest `entry_time` (not first `exit_time`).
  - Continue cumulative PnL from 0 after that.
  - Keep drawdown guard (`peak > 0`) to avoid divide-by-zero issues from zero-start curves.
- Result: recomputed strategy always has first visible point = exactly 0.

2) Add client-side normalization safety net for legacy data
- File: `src/hooks/use-strategies.ts`
- Add helper like `normalizeCurveToZero(curve: EquityPoint[]): EquityPoint[]`:
  - Sort by timestamp (stable)
  - Detect first point’s equity as baseline
  - If baseline !== 0, subtract baseline from every point
  - Recompute drawdown from normalized equity (or preserve existing drawdown only when baseline is already zero)
- Apply normalization in both:
  - `useStrategies` mapped list data
  - `useStrategy` single strategy data
- Result: all screens show $0-start curves immediately, even before persistent migration.

3) Add bulk recompute action for persistent cleanup
- Files:
  - `src/hooks/use-strategies.ts`
  - `src/pages/Strategies.tsx`
- Add `useRecomputeAllEquity` mutation:
  - Fetch user strategies
  - For each strategy, run same recompute routine used by single-strategy action
  - Continue on per-strategy errors and show summary toast (e.g., “Recomputed 12/14 strategies”)
- Add button in Strategies page toolbar:
  - “Recompute All Equity”
  - Loading state + disable during execution
- Result: one-click migration for all legacy strategies, no manual per-strategy clicks.

4) Tighten query ordering to reduce duplicate-timestamp drift
- File: `src/hooks/use-strategies.ts`
- For equity fetches, use deterministic ordering (timestamp + created_at/id) where available.
- Result: consistent chart start and tooltip behavior when multiple points share same timestamp.

5) Update tests to match zero-baseline model
- File: `src/lib/parsers/tradingview.test.ts`
- Current expectations are stale (still asserting ~100k).
- Update to assert:
  - initial equity point at 0 (if parser includes seed point)
  - cumulative values relative to zero
- Add/adjust test for recompute-like duplicate timestamp edge case (if test coverage exists for hooks/utils).

Why this solves your issue
- Immediate display fix: normalization ensures curves render from $0 now.
- Permanent data fix: bulk recompute rewrites stored curves to proper $0 baseline.
- Regression prevention: recompute timestamp fix prevents ambiguous first point ordering.

Backend/security considerations
- No schema migration needed.
- No RLS changes needed (existing user-owned policies already support read/delete/insert on equity rows).
- Only user-owned data is updated through existing authenticated flow.

Validation checklist
1) Pick 2 known legacy strategies that currently start at ~100k.
2) Confirm they display from $0 immediately after code change (without pressing any button).
3) Run “Recompute All Equity”.
4) Refresh app and verify those strategies still start at $0 (persistent fix).
5) Open one strategy detail and click single “Recompute Equity”; verify first point remains $0.
6) Verify negative section still renders red and zero reference line is visible.

Risk and mitigation
- Risk: changing baseline impacts metric calculations that assume absolute equity.
- Mitigation: this plan only fixes baseline consistency; if desired, I can follow up by hardening annualized return/drawdown ratio formulas for pure cumulative-PnL curves in a dedicated pass.
