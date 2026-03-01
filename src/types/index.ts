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

export type FileFormat = "backtrader" | "ninjatrader" | "quantconnect" | "generic";
