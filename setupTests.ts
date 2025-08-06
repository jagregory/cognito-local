import { expect } from "vitest";

expect.extend({
  jsonMatching(actual: any, expected: any) {
    const pass = this.equals(JSON.parse(actual), expected);

    expected.toString = function (this: any) {
      return JSON.stringify(this);
    }.bind(expected);

    return {
      pass,
      message: () =>
        `expected ${actual} to equal ${expected} when parsed as JSON`,
    };
  },
});

interface CustomMatchers<R = unknown> {
  jsonMatching: (expected: any) => R;
}

declare module "vitest" {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}
