module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'managers/entities/school/*.manager.js',
    'managers/entities/classroom/*.manager.js',
    'managers/entities/student/*.manager.js',
    'managers/entities/user/*.manager.js',
    'managers/token/*.manager.js',
    'managers/response_dispatcher/*.manager.js',
    'managers/api/*.manager.js',
    'mws/__token.mw.js',
    'mws/__superadmin.mw.js',
    'mws/__schoolAdmin.mw.js',
    '!**/node_modules/**',
    '!**/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 55,
      functions: 83,
      lines: 68,
      statements: 65,
    },
  },
  testMatch: ['**/__tests__/**/*.test.js', '**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/coverage/'],
  verbose: true,
};
