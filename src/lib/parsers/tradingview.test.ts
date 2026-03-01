import { describe, it, expect } from "vitest";
import { parseTradingView } from "./tradingview";
import { detectFormat, parseFile } from "./index";

const SAMPLE_TV_CSV = `Trade #,Type,Signal,Date/Time,Price,Contracts,Profit,Cum. Profit,Run-up,Drawdown
1,Entry Long,Buy,2025-01-02 10:00,475.50,100,,,, 
1,Exit Long,Sell,2025-01-02 15:30,478.20,100,270,270,300,10
2,Entry Short,Sell,2025-01-03 09:30,182.00,50,,,, 
2,Exit Short,Buy,2025-01-03 14:00,179.50,50,125,395,130,5
3,Entry Long,Buy,2025-01-06 10:15,248.00,30,,,, 
3,Exit Long,Sell,2025-01-06 16:00,245.30,30,-81,314,20,90`;

describe("TradingView parser", () => {
  it("detects tradingview format", () => {
    expect(detectFormat(SAMPLE_TV_CSV, "report.csv")).toBe("tradingview");
  });

  it("parses trades correctly", () => {
    const result = parseTradingView(SAMPLE_TV_CSV, "test-strategy");
    expect(result.format).toBe("tradingview");
    expect(result.trades).toHaveLength(3);
    expect(result.warnings).toHaveLength(0);

    const t1 = result.trades[0];
    expect(t1.direction).toBe("long");
    expect(t1.entryPrice).toBe(475.5);
    expect(t1.exitPrice).toBe(478.2);
    expect(t1.quantity).toBe(100);
    expect(t1.pnlNet).toBe(270);

    const t2 = result.trades[1];
    expect(t2.direction).toBe("short");
    expect(t2.pnlNet).toBe(125);

    const t3 = result.trades[2];
    expect(t3.pnlNet).toBe(-81);
  });

  it("generates equity curve starting at $0", () => {
    const result = parseTradingView(SAMPLE_TV_CSV, "test-strategy");
    expect(result.equityCurve).toHaveLength(4); // seed + 3 trades
    expect(result.equityCurve[0].equity).toBe(0);
    expect(result.equityCurve[1].equity).toBe(270);
    expect(result.equityCurve[2].equity).toBe(395);
    expect(result.equityCurve[3].equity).toBe(314);
  });

  it("works via parseFile", () => {
    const result = parseFile(SAMPLE_TV_CSV, "tv_report.csv", "s1");
    expect(result.format).toBe("tradingview");
    expect(result.trades).toHaveLength(3);
  });
});
