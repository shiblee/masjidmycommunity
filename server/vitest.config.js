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
    // Bumped from 30s after a live run on production hit this ceiling on
    // Prayer Times' beforeAll (one full createApprovedMasjid pipeline: OTP
    // round trips for 3 contacts, a photo upload with real AI moderation,
    // admin approval) -- the same chain finishes well under 30s from a
    // dev machine, but the small production box the suite now runs on
    // (see fileParallelism below) has less headroom against a slow moment
    // from an external OTP/AI provider.
    hookTimeout: 60000,
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
