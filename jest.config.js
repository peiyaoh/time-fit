// jest.config.js
/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  // Look for tests in all `packages` and `apps` directories
  // disable to work on GitBash
  //testMatch: [
  //  '<rootDir>/packages/**/?(*.)+(spec|test).[jt]s',
  //  '<rootDir>/apps/**/?(*.)+(spec|test).[jt]s'
  //],
  // Required for ESM support
  // https://jestjs.io/docs/ecmascript-modules
  //extensionsToTreatAsEsm: ['.js'],
  transform: {}, // Disable babel-jest or other transformations if you're using native ESM
  // Next.js page files happen to be named test.js (e.g. apps/fitbit-break/pages/test.js,
  // pages/api/test.js). They are not jest suites and use ESM/JSX syntax jest can't parse;
  // exclude the whole pages tree so they're never collected as test files.
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/apps/fitbit-break/pages/',
    '<rootDir>/apps/fitbit-break/.next/',
  ],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  moduleNameMapper: {
    // This is crucial for Jest to resolve your monorepo packages when running from the
    // root. Two entries, most-specific first: a subpath import like
    // "@time-fit/helper/DateTimeHelper.js" must resolve to that exact file, not fall
    // through to the bare-specifier rule below (which only fits "@time-fit/helper" with
    // no subpath, resolving to that package's main entry point).
    '^@time-fit/([^/]+)/(.*)$': '<rootDir>/packages/$1/$2',
    '^@time-fit/([^/]+)$': '<rootDir>/packages/$1/index.js',
  },
};

export default config;