export default [
  { test: { include: ['src/**/*.test.{js,jsx}'], environment: 'jsdom' } },
  { test: { include: ['api/**/*.test.js'], environment: 'node' } },
];
