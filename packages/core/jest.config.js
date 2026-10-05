// jest.config.js
/** @type {import('jest').Config} */
const config = {
  testEnvironment: "node",
  rootDir: ".",
  transform: {}, // native ESM, no transpilation
  coverageProvider: "v8",
  // contracts.js holds only JSDoc type definitions; no runtime code imports it.
  collectCoverageFrom: ["src/**/*.js", "!src/contracts.js"],
  // Plan acceptance for Stage C1: full coverage of the pure kernel.
  coverageThreshold: {
    global: { branches: 100, functions: 100, lines: 100, statements: 100 },
  },
};

export default config;
