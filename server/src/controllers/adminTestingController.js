import { execFile } from "child_process";
import { promisify } from "util";
import { readFile, unlink } from "fs/promises";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import DevDocModule from "../models/DevDocModule.js";
import TestRun from "../models/TestRun.js";
import { TEST_MODULE_FILES } from "../config/testModuleFiles.js";

const execFileAsync = promisify(execFile);

// server/src/controllers -> server (two levels up) -- resolved from this
// file's own location rather than trusting process.cwd(), since pm2/npm
// don't always launch from the same working directory.
const SERVER_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../");

const FILE_TO_MODULE_KEY = Object.fromEntries(Object.entries(TEST_MODULE_FILES).map(([key, file]) => [file, key]));

function moduleKeyForTestFile(absolutePath) {
  const relative = path.relative(SERVER_ROOT, absolutePath).split(path.sep).join("/");
  return FILE_TO_MODULE_KEY[relative] || null;
}

// The actual `vitest run` execution -- runs fully detached from the HTTP
// request that triggered it (see runTests below). Always resolves; never
// throws, since there's no request left listening for a rejection by the
// time this settles.
async function executeAndRecord(runId, start) {
  const outputFile = path.join(os.tmpdir(), `vitest-results-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  try {
    // vitest exits non-zero whenever any test fails -- that's an expected,
    // informative outcome to report, not a failure to run the suite at
    // all, so a non-zero exit here is deliberately not treated as an
    // error. Whether the run actually completed is judged below by
    // whether it left behind a results file, not by the exit code.
    await execFileAsync("npx", ["vitest", "run", "--reporter=json", `--outputFile=${outputFile}`], {
      cwd: SERVER_ROOT,
      timeout: 600000,
      maxBuffer: 20 * 1024 * 1024,
    }).catch(() => {});

    const raw = await readFile(outputFile, "utf8").catch(() => null);
    await unlink(outputFile).catch(() => {});
    if (!raw) {
      await TestRun.update(
        { overallStatus: "error", errorMessage: "The test run didn't produce a result file -- it may have timed out or crashed before finishing.", durationMs: Date.now() - start },
        { where: { id: runId } }
      );
      return;
    }

    const report = JSON.parse(raw);
    const modules = await DevDocModule.findAll();
    const moduleByKey = new Map(modules.map((m) => [m.key, m]));

    const byModule = [];
    for (const fileResult of report.testResults) {
      const moduleKey = moduleKeyForTestFile(fileResult.name);
      const module = moduleKey ? moduleByKey.get(moduleKey) : null;
      byModule.push({
        moduleKey,
        moduleTitle: module?.title || path.basename(fileResult.name),
        fileStatus: fileResult.status,
        // Populated when the whole file errors out before/between tests --
        // e.g. a beforeAll hook that threw or timed out -- so a suite-level
        // failure (every test shows "skipped", nothing itself asserts
        // false) is still diagnosable from the dashboard instead of only
        // reproducible by re-running locally against production by hand.
        fileMessage: fileResult.status !== "passed" ? fileResult.message?.split("\n").slice(0, 4).join("\n") || null : null,
        tests: fileResult.assertionResults.map((a) => ({
          title: a.title,
          status: a.status,
          durationMs: Math.round(a.duration || 0),
          // Set via `task.meta.detail = "..."` inside the test itself -- a
          // one-line statement of what was actually verified (request made,
          // status/behavior expected), not just a restatement of the title.
          detail: a.meta?.detail || null,
          failureMessage: a.failureMessages?.[0]?.split("\n")[0] || null,
        })),
      });
    }

    const overallStatus = report.numFailedTests > 0 ? "failed" : "passed";
    await TestRun.update(
      {
        overallStatus,
        totalTests: report.numTotalTests,
        passedTests: report.numPassedTests,
        failedTests: report.numFailedTests,
        resultsJson: byModule,
        durationMs: Date.now() - start,
      },
      { where: { id: runId } }
    );
  } catch (error) {
    await unlink(outputFile).catch(() => {});
    await TestRun.update({ overallStatus: "error", errorMessage: error.message, durationMs: Date.now() - start }, { where: { id: runId } }).catch(() => {});
  }
}

// Starts a real `vitest run` child process and returns immediately with a
// "running" placeholder row -- doesn't wait for the suite to finish. The
// suite now takes long enough (100+ real network-calling tests) that a
// synchronous response regularly outlives the infrastructure's own ~60s
// reverse-proxy timeout in front of this app, which is shorter than and
// independent of this handler's own (much larger) internal budget -- no
// amount of raising a timeout inside this process fixes a timeout enforced
// in front of it. The client polls GET /testing/runs and shows this row
// updating in place once it's done (see listTestRuns below).
export const runTests = async (req, res) => {
  const start = Date.now();
  try {
    const run = await TestRun.create({ overallStatus: "running", triggeredByName: req.user.name || req.user.email });
    executeAndRecord(run.id, start);
    res.status(202).json({ run });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listTestRuns = async (req, res) => {
  try {
    const runs = await TestRun.findAll({ order: [["createdAt", "DESC"]], limit: 30 });
    res.json({ runs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
