import { calculatePortfolioScore } from "../ai/portfolioScore";

jest.mock("../utils/constants", () => ({
  PHAROS: { chainId: 1672, rpcUrl: "http://localhost", nativeCurrency: { symbol: "PROS", decimals: 18 } },
  TOKEN_REGISTRY: {},
  ERC20: { balanceOf: () => "" },
  getProsPrice: jest.fn().mockResolvedValue(0.614),
  getTokenPrice: jest.fn().mockImplementation((sym: string) => {
    const prices: Record<string, number> = { USDC: 1, WETH: 1800, LINK: 14 };
    return Promise.resolve(prices[sym] ?? null);
  }),
}));

jest.mock("../services/rpc", () => ({
  getProvider: jest.fn(),
  callContract: jest.fn(),
  withRetry: jest.fn(),
}));

describe("portfolioScore", () => {
  test("penalizes high PROS concentration", async () => {
    const balances = [
      { symbol: "PROS", balance: 700000000000000000000n, decimals: 18 },
      { symbol: "USDC", balance: 100000000n, decimals: 6 },
    ];
    const score = await calculatePortfolioScore("0x123", balances);
    expect(score.diversification).toBeLessThan(100);
    expect(score.risk).toBeGreaterThan(30);
  });

  test("rewards balanced portfolio with grade A", async () => {
    const balances = [
      { symbol: "PROS", balance: 250000000000000000000n, decimals: 18 },
      { symbol: "USDC", balance: 250000000n, decimals: 6 },
      { symbol: "WETH", balance: 100000000000000000n, decimals: 18 },
      { symbol: "LINK", balance: 500000000000000000000n, decimals: 18 },
    ];
    const score = await calculatePortfolioScore("0x123", balances);
    expect(score.grade).toBe("A");
    expect(score.diversification).toBe(100);
  });
});
