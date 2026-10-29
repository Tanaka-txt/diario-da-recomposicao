// Testes de ponta a ponta num celular simulado (390 × 844, tema escuro).
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30_000,
  reporter: 'list',
  use: {
    browserName: 'chromium',
    viewport: { width: 390, height: 844 },
    colorScheme: 'dark',
    hasTouch: false,
  },
});
