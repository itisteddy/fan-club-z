module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@fanclubz/shared$': '<rootDir>/../shared/dist',
    '^@fanclubz/shared/(.*)$': '<rootDir>/../shared/dist/$1',
  },
};
