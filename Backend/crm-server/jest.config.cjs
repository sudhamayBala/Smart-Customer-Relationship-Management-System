module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  moduleNameMapper: {
    "^jose$": "<rootDir>/tests/joseMock.ts"
  },
  testMatch: [
    "<rootDir>/tests/**/*.test.ts"
  ],
  passWithNoTests: false
};