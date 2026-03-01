

# QuantForge — Backtesting Analytics Platform

A professional-grade backtesting analytics platform for serious quant traders, built with a dark trading-terminal aesthetic.

---

## Phase 1: Core Platform & Analytics Engine

### 1. Dark Trading Terminal UI Shell
- Professional dark theme with trading-terminal aesthetic (deep navy/charcoal backgrounds, accent colors for positive/negative PnL)
- Sidebar navigation: Dashboard, Strategies, Portfolio, Journal, Live Trading, Settings
- Responsive layout with a top stats bar showing key portfolio metrics

### 2. Strategy Upload & Data Normalization
- Drag-and-drop upload zone supporting multiple formats:
  - Python Backtrader CSV
  - NinjaTrader exports
  - QuantConnect JSON
  - Generic CSV with column mapping
- Format auto-detection with preview before import
- Parsers that normalize all formats into a unified trade/equity data structure

### 3. Strategy Analytics Dashboard
- **Metrics Grid**: Sharpe ratio, Sortino ratio, Calmar ratio, max drawdown, win rate, profit factor, expectancy, total return, annualized return
- **Equity Curve**: Interactive chart with drawdown overlay
- **Monthly Returns Heatmap**: Color-coded grid (green/red) by month and year
- **Trade Distribution**: Histogram of P&L per trade
- **Rolling Metrics**: 30/60/90-day rolling Sharpe and drawdown charts
- **Trade-Level Detail Table**: Sortable, filterable list of all trades with entry/exit, P&L, duration

### 4. Supabase Backend & Auth
- Multi-user authentication (email/password signup & login)
- Database schema: profiles, strategies, trades, equity_curves
- Row-level security so each user sees only their own data
- File storage bucket for uploaded backtest files

---

## Phase 2: Portfolio Management & Journaling

### 5. Portfolio Builder
- Combine multiple strategies with custom allocation weights (slider-based)
- Combined portfolio equity curve and metrics
- Strategy attribution chart showing each strategy's contribution to returns
- Correlation matrix between strategies

### 6. Strategy Journal
- Pre-trade setup logs with rich text notes and image attachments
- Post-trade review comments linked to specific trades
- Conviction scoring (1-5) for each journal entry
- Timeline view of all journal entries per strategy

### 7. Performance Alerts
- Configurable alerts: rolling Sharpe drops below threshold, drawdown exceeds limit, win rate degrades
- Alert dashboard showing triggered and acknowledged alerts
- Visual indicators on strategy cards when alerts are active

---

## Phase 3: Live Trading Integration

### 8. Broker API Integration (Alpaca)
- Secure API key storage via Supabase secrets
- Live account connection and trade sync via edge functions
- Live vs. backtested performance comparison view
- Execution quality tracking: slippage analysis, fill rate

### 9. Advanced Analytics
- Stress testing scenarios
- Monte Carlo simulation of strategy outcomes
- Benchmark comparison (S&P 500, etc.)

---

## Design & UX Principles
- **Dark terminal aesthetic**: Deep backgrounds, monospace fonts for data, green/red PnL colors
- **Interactive Recharts**: Tooltips, zoom, crosshair on all charts
- **Information density**: Dashboard designed for multiple monitors, dense data display
- **Mobile responsive**: Core metrics and equity curves accessible on mobile

