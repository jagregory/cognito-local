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

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Expect {
      jsonMatching(expected: any): any;
    }
  }
}

// "Payload": {"version":0,"callerContext":{"awsSdkVersion":"2.953.0","clientId":"clientId"},"region":"local","userPoolId":"userPoolId","triggerSource":"UserMigration_Authentication","request":{"userAttributes":{},"validationData":{},"password":"password"},"response":{},"userName":"username"}
// "Payload": {"version":0,"callerContext":{"awsSdkVersion":"2.953.0","clientId":"clientId"},"region":"local","userPoolId":"userPoolId","triggerSource":"UserMigration_Authentication","request":{"userAttributes":{},"validationData":{},"password":"password"},"response":{},"userName":"username"}

export {};

afterEach(() => {
  jest.resetAllMocks();
});
