import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  dir: './',
});

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^server-only$': '<rootDir>/test/mocks/server-only.ts',
  },

  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],

  collectCoverageFrom: [
    'app/api/**/*.{ts,tsx}',
    'app/(auth)/login/LoginActions.ts',
    'components/analytics/AnalyticsEngagementBatcher.tsx',
    'components/chat/chatMessages.ts',
    'components/navbar/Navbar.tsx',
    'components/ui/Button.tsx',
    'features/**/*.{ts,tsx}',
    'lib/auth/**/*.ts',
    'lib/security/**/*.ts',
    'lib/useActiveSection.ts',
    '!**/*.d.ts',
    '!**/types.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
  ],

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  clearMocks: true,
  verbose: true,
};

export default createJestConfig(config);
