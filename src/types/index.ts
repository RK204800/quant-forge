export interface Trade {
  id: string;
  strategyId: string;
  externalId?: string;
  entryTime: string;
  exitTime: string;
  direction: "long" | "short";
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnlGross: number;
  pnlNet: number;
  commission: number;
  slippage: number;
  instrument: string;
  notes?: string;
  mae?: number;
  mfe?: number;
}

export interface EquityPoint {
  timestamp: string;
  equity: number;
  drawdown: number;
  benchmarkReturn?: number;
}

export interface Strategy {
  id: string;
  userId?: string;
  name: string;
  description: string;
  assetClass: string;
  timeframe: string;
  broker: string;
  backtestEngine: string;
  status: "active" | "paused" | "archived";
  createdAt: string;
  updatedAt: string;
  trades: Trade[];
  equityCurve: EquityPoint[];
  strategyClass?: string;
  parameters?: Record<string, any>;
  parameterTemplate?: Record<string, any>;
  isFavorite?: boolean;
  showOnDashboard?: boolean;
  tags?: StrategyTag[];
  folderId?: string | null;
}

export interface StrategyTag {
  id: string;
  userId: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface StrategyMetrics {
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
  maxDrawdownDuration: number;
  winRate: number;
  profitFactor: number;
  expectancy: number;
  totalTrades: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
  avgHoldingPeriod: number;
}

export interface ExtendedMetrics extends StrategyMetrics {
  grossProfit: number;
  grossLoss: number;
  totalCommission: number;
  maxConsecWins: number;
  maxConsecLosses: number;
  avgTradesPerDay: number;
  profitPerMonth: number;
  maxRecoveryDays: number;
  startDate: string;
  endDate: string;
  winningTrades: number;
  losingTrades: number;
  evenTrades: number;
  avgWinLossRatio: number;
}

export interface MonteCarloResult {
  simulations: number;
  percentiles: {
    p5: number;
    p25: number;
    p50: number;
    p75: number;
    p95: number;
  };
  maxDrawdownPercentiles: {
    p5: number;
    p25: number;
    p50: number;
    p75: number;
    p95: number;
  };
  riskOfRuin: number;
  equityPaths: number[][];
}

export interface RROptimizationPoint {
  ratio: number;
  label: string;
  projectedWinRate: number;
  profitFactor: number;
  expectancy: number;
  totalReturn: number;
  survivingTrades: number;
  avgWin: number;
  avgLoss: number;
}

export interface WalkForwardSegment {
  segmentIndex: number;
  tradeCount: number;
  sharpe: number;
  winRate: number;
  profitFactor: number;
  totalReturn: number;
}

export interface RegimeInfo {
  type: "bull" | "bear";
  startDate: string;
  endDate: string;
  duration: number;
  returnPct: number;
  sharpe: number;
}

export interface StabilityScore {
  overall: number;
  sharpeConsistency: number;
  drawdownRecovery: number;
  winRateStability: number;
  profitFactorStability: number;
}

export interface MonthlyReturn {
  year: number;
  month: number;
  return: number;
}

export interface PortfolioAllocation {
  strategyId: string;
  strategyName: string;
  weight: number;
}

export interface JournalEntry {
  id: string;
  strategyId: string;
  tradeId?: string;
  type: "pre_trade" | "post_trade" | "review";
  content: string;
  conviction: number;
  createdAt: string;
}

export type FileFormat = "backtrader" | "ninjatrader" | "quantconnect" | "tradingview" | "nautilustrader" | "generic" | "mapped";

export type TradeField =
  | "entryTime"
  | "exitTime"
  | "direction"
  | "entryPrice"
  | "exitPrice"
  | "pnl"
  | "quantity"
  | "instrument"
  | "commission"
  | "mae"
  | "mfe"
  | "tradeNumber"
  | "skip";

export interface ColumnMapping {
  [csvHeader: string]: TradeField;
}
