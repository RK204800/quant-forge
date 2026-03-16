

## World-Class Portfolio Risk Management Suite

### Overview
Add a comprehensive "Portfolio Risk Assessment" tab/section to the Portfolio Detail page with institutional-grade risk management analytics. This is a pure client-side computation layer -- no database changes needed.

### New File: `src/lib/portfolio-analytics.ts`

A dedicated analytics engine for portfolio-level risk computations containing all the functions below.

#### 1. Kelly Criterion Position Sizing
- **Per-strategy Kelly fraction**: `f* = W - (1-W)/R` where W = win rate, R = avg win / avg loss
- **Half-Kelly** (industry standard conservative): `f*/2`
- **Portfolio-level Kelly**: Optimal fraction adjusted for correlation between strategies
- Display recommended allocation vs current allocation with a comparison table

#### 2. Conservative Drawdown Stress Test (MAE-based)
- For each strategy, find the worst MAE across all trades (or estimated MAE)
- **Concurrent worst-case**: Sum of all strategies' worst MAEs simultaneously (assume all open positions hit max adverse excursion at once)
- **Weighted worst-case**: Apply portfolio weights to the concurrent MAE sum
- Show as dollar amount and as percentage of a user-configurable account size (default $100,000)
- Display per-strategy MAE contribution breakdown

#### 3. Portfolio Heat / Margin of Safety
- **Portfolio Heat** = sum of all position risks (worst-case stop distances) as % of capital
- Risk budget consumed: how much of a configurable max-risk threshold (e.g. 6% of capital) is used
- Traffic-light indicator: Green (<50% budget), Yellow (50-80%), Red (>80%)

#### 4. Diversification Score
- Uses existing correlation matrix computation (Pearson)
- **Diversification Ratio** = weighted sum of individual volatilities / portfolio volatility
- Higher ratio = better diversification
- Score normalized 0-100 with interpretation labels (Poor / Fair / Good / Excellent)

#### 5. Tail Risk Analysis (CVaR / Expected Shortfall)
- **Value at Risk (VaR)** at 95% and 99% confidence from combined daily PnL distribution
- **Conditional VaR (CVaR)**: Average loss in the worst 5% of days
- Per-strategy contribution to portfolio tail risk

#### 6. Portfolio Monte Carlo
- Run Monte Carlo on the combined portfolio trade stream (interleaved by date, weighted)
- Show portfolio-level percentile equity paths, risk of ruin, and max drawdown distribution
- Reuses existing `runMonteCarlo` logic with combined PnL stream

#### 7. Concentration Risk
- **Herfindahl-Hirschman Index (HHI)** of portfolio weights
- Flag if any single strategy exceeds configurable threshold (e.g. 40%)
- Instrument overlap detection: count shared instruments across strategies

#### 8. Portfolio Stability Score
- Composite score (0-100) combining:
  - Diversification ratio (25%)
  - Kelly alignment (25%) -- how close current weights are to optimal
  - Drawdown resilience (25%) -- worst-case MAE vs capital
  - Tail risk grade (25%) -- CVaR relative to expected return
- Letter grade: A+ through F

### New Component: `src/components/portfolio/PortfolioRiskAssessment.tsx`

A tabbed or sectioned component that renders all the above analytics:

```text
+------------------------------------------------------+
| PORTFOLIO RISK ASSESSMENT                            |
|------------------------------------------------------|
| [Overall Score: A-  (82/100)]                        |
|                                                      |
| +-- Risk Summary Cards (4-col grid) ---------------+ |
| | Kelly Optimal | Worst-Case DD | VaR 95% | Heat   | |
| +--------------------------------------------------+ |
|                                                      |
| +-- Kelly Position Sizing Table -------------------+ |
| | Strategy | WinRate | R:R | Kelly | Half-Kelly |  | |
| |          |         |     | Curr% | Suggest%   |  | |
| +--------------------------------------------------+ |
|                                                      |
| +-- Stress Test (MAE Concurrent) ------------------+ |
| | Strategy | Worst MAE | Weight | Contrib          | |
| | TOTAL    | $X,XXX    | ---    | $X,XXX           | |
| +--------------------------------------------------+ |
|                                                      |
| +-- Tail Risk (VaR / CVaR) -----------------------+ | 
| | VaR 95%: $X,XXX  |  CVaR 95%: $X,XXX           | |
| | VaR 99%: $X,XXX  |  CVaR 99%: $X,XXX           | |
| +--------------------------------------------------+ |
|                                                      |
| +-- Concentration & Diversification ---------------+ |
| | HHI: 0.XX  |  Div Ratio: X.XX  |  Score: XX/100 | |
| | Instrument Overlap Matrix                        | |
| +--------------------------------------------------+ |
|                                                      |
| +-- Portfolio Monte Carlo -------------------------+ |
| | (Reuses MonteCarloChart with combined PnLs)      | |
| +--------------------------------------------------+ |
+------------------------------------------------------+
```

### Integration into PortfolioDetail.tsx

- Add the `<PortfolioRiskAssessment>` component after the correlation matrix
- Pass `memberStrategies` (with trades, equity curves, weights) and an `accountSize` prop (default 100k, editable inline)
- Only renders when 1+ strategies are in the portfolio

### Files to Create
- `src/lib/portfolio-analytics.ts` -- all computation functions
- `src/components/portfolio/PortfolioRiskAssessment.tsx` -- full UI component

### Files to Modify
- `src/pages/PortfolioDetail.tsx` -- import and render the new component

### Technical Details

**Kelly Criterion formula:**
```text
f* = W - (1 - W) / R
where W = win rate (decimal), R = avgWin / avgLoss
Half-Kelly = f* / 2
```

**Diversification Ratio:**
```text
DR = (sum of w_i * sigma_i) / sigma_portfolio
where sigma_portfolio = sqrt(w' * C * w), C = covariance matrix
```

**CVaR calculation:**
```text
Sort daily PnLs ascending
VaR_95 = PnL at 5th percentile
CVaR_95 = mean of all PnLs below VaR_95
```

**HHI (concentration):**
```text
HHI = sum(w_i^2) where w_i are normalized weights
Range: 1/n (perfect diversification) to 1.0 (single strategy)
```

**Composite Portfolio Score weighting:**
```text
Score = 0.25 * diversification_score
      + 0.25 * kelly_alignment_score
      + 0.25 * drawdown_resilience_score
      + 0.25 * tail_risk_grade
```

All computations are client-side using existing trade data -- no API calls or database changes required.

