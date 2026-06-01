import { calculateDaoScore } from "../ai/daoScore";

describe("daoScore", () => {
  test("max score is 100", () => {
    const result = calculateDaoScore(true, 4, 3);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  test("no governance participation yields low score", () => {
    const result = calculateDaoScore(false, 0, 0);
    expect(result.score).toBeLessThan(50);
  });
});
