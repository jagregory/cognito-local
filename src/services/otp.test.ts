import { otp } from "./otp";

describe("otp", () => {
  it("generates a code", () => {
    expect(otp()).toMatch(/^[0-9]{6}$/);
  });
});
