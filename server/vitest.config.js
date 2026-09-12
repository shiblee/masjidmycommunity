import { defineConfig } from "vitest/config";

// Every test here makes real network calls to the live API (see
// tests/helpers/testClient.js) -- default 5s timeouts are too tight once a
// test or setup hook chains a few requests together (register -> verify ->
// login, for example).
export default defineConfig({
  test: {
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
