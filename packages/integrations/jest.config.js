/** @type {import('jest').Config} */
const config = {
  testEnvironment: "node",
  rootDir: ".",
  transform: {},
  coverageProvider: "v8",
  collectCoverageFrom: ["src/**/*.js"],
  coverageThreshold: {
    global: { branches: 100, functions: 100, lines: 100, statements: 100 },
  },
};

export default config;
