// jest.config.js
/** @type {import('jest').Config} */
const config = {
    testEnvironment: 'node',
    rootDir: '.',
    // Look for tests in all `packages` and `apps` directories
    // disable to work on GitBash
    /*
    testMatch: [
      '<rootDir>/?(*.)+(spec|test).[jt]s'
    ],
    */
    // Required for ESM support
    // https://jestjs.io/docs/ecmascript-modules
    //extensionsToTreatAsEsm: ['.js'],
    transform: {}, // Disable babel-jest or other transformations if you're using native ESM
    globals: {
      'ts-jest': {
        useESM: true,
      }
    }
  };
  
  export default config;