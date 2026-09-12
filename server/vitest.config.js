import { defineConfig } from "vitest/config";

// Every test here makes real network calls to the live API (see
// tests/helpers/testClient.js) -- default 5s timeouts are too tight once a
// test or setup hook chains a few requests together (register -> verify ->
// login, for example).
export default defineConfig({
  test: {
    // Bumped from 20s: the Masjid/Prayer Times suite chains a much longer
    // real pipeline per masjid (create, verify 3 office-bearer contacts via
    // real OTP round trips, upload a photo, submit, admin-approve -- plus
    // two real AI content-moderation calls), and one test polls for an
    // unawaited async job (ensurePrayerScheduleForMasjid) to finish.
    testTimeout: 30000,
    hookTimeout: 30000,
    // The suite runs on the same small production instance it's testing
    // against (see adminTestingController.js) -- with 20 files' worth of
    // real HTTP+bcrypt+DB work running as vitest's default concurrent
    // worker threads, the server ends up contending with itself for CPU
    // badly enough to blow past even a 300s ceiling (confirmed: the same
    // 186 tests that time out under default parallelism finish in ~50s
    // serialized, with zero failures -- the one failure seen under
    // parallelism was a cross-file race, not a real bug). Running files
    // one at a time trades wall-clock time for actually finishing.
    fileParallelism: false,
  },
});
