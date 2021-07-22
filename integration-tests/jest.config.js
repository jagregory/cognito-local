module.exports = {
  roots: ["."],
  transform: {
    "^.+\\.ts$": "esbuild-jest",
  },
  testMatch: ["**/*.test.ts"],
};
