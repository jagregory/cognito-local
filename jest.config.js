module.exports = {
  roots: ["<rootDir>/src"],
  setupFiles: ["jest-date-mock"],
  setupFilesAfterEnv: [
    "<rootDir>/setupTests.ts",
    "jest-extended/all"
  ],
  transform: {
    "^.+\\.ts$": "esbuild-jest",
  },
  testMatch: ["**/*.test.ts"],
};
