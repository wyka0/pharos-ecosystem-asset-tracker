import { analyzeRisk } from "../ai/riskEngine";

describe("riskEngine", () => {
  test("high failure rate increases risk", () => {
    const txs = Array(10).fill({ status: "failed" }).concat(Array(40).fill({ status: "success" }));
    const result = analyzeRisk("0x123", txs, []);
    expect(result.riskLevel).toBe("High");
    expect(result.riskScore).toBeGreaterThan(60);
  });

  test("clean history yields low risk", () => {
    const txs = Array(50).fill({ status: "success", to: "0x" + "a".repeat(40) });
    const result = analyzeRisk("0x123", txs, []);
    expect(result.riskLevel).toBe("Low");
    expect(result.riskScore).toBeLessThan(30);
  });
});
