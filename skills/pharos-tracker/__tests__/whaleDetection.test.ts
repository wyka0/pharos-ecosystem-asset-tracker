import { detectWhales } from "../ai/whaleDetection";

describe("whaleDetection", () => {
  test("classifies 15k USDC as Mega Whale", async () => {
    const transfers = [{ token: "USDC", value: 15000, from: "0xa", to: "0xb", timestamp: Date.now() }];
    const result = await detectWhales("0xb", transfers, 0.614);
    expect(result.alert).toContain("Mega Whale");
  });

  test("classifies 500k PROS as Whale", async () => {
    const transfers = [{ token: "PROS", value: 500000, from: "0xa", to: "0xb", timestamp: Date.now() }];
    const result = await detectWhales("0xb", transfers, 0.614);
    expect(result.alert).toContain("Whale");
  });
});
