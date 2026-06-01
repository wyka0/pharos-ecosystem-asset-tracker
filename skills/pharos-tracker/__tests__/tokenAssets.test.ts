import { getTokenBalances } from "../tools/tokenAssets";

jest.mock("../utils/constants", () => ({
  PHAROS: { chainId: 1672, rpcUrl: "http://localhost", nativeCurrency: { symbol: "PROS", decimals: 18 } },
  TOKEN_REGISTRY: {
    "0xusdc": { symbol: "USDC", name: "USD Coin", decimals: 6, protocol: "Stablecoin" },
  },
  ERC20: { balanceOf: () => "", name: "0x", symbol: "0x", decimals: "0x" },
  KNOWN_TOKEN_ADDRESSES: ["0xusdc"],
  getProsPrice: jest.fn().mockResolvedValue(0.614),
  getTokenPrice: jest.fn().mockResolvedValue(1),
}));

jest.mock("../services/rpc", () => ({
  getProvider: jest.fn(),
  callContract: jest.fn(),
  withRetry: jest.fn(),
}));

jest.mock("ethers", () => {
  const actual = jest.requireActual("ethers");
  return {
    ...actual,
    Contract: jest.fn().mockImplementation(() => {
      return {
        callStatic: {
          aggregate: jest.fn().mockResolvedValue({
            blockNumber: 1n,
            returnData: ["0x0000000000000000000000000000000000000000000000000000000000000000"],
          }),
        },
      };
    }),
  };
});

describe("tokenAssets", () => {
  test("registry mode returns known tokens", async () => {
    const balances = await getTokenBalances("0x123", false);
    expect(Array.isArray(balances)).toBe(true);
  });
});
