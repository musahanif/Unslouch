// jest.config.js  (project root: backend/)
export default {
  // Use Node environment (not browser/jsdom)
  testEnvironment: "node",

  // Transform ESM → CJS on the fly using Babel (see babel.config.json below)
  transform: {
    "^.+\\.js$": "babel-jest",
  },

  // Test files must live under tests/
  testMatch: ["**/tests/**/*.test.js"],

  // Run test files serially (--runInBand) so each file gets a clean DB state
  // without parallel writes fighting each other.
  // This is set via the npm script flag: see package.json.

  // Global setup / teardown (optional — handled inside each test file)
  // globalSetup: "./tests/global-setup.js",

  // Timeout per test: 15 seconds (network + DB operations can be slow)
  testTimeout: 15000,

  // Show individual test names in CI output
  verbose: true,
};
