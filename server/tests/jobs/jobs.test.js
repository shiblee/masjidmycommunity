import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { api, adminAuth, registerAndVerify, deleteTestUser } from "../helpers/testClient.js";

describe("Jobs", () => {
  let poster, applicant;
  let jobId;
  let applicationId;

  beforeAll(async () => {
    poster = await registerAndVerify({ fullName: "DevTest JobPoster" });
    applicant = await registerAndVerify({ fullName: "DevTest JobApplicant" });
  });

  afterAll(async () => {
    const { token } = await adminAuth();
    if (jobId) await api(`/api/admin/jobs/${jobId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    await deleteTestUser(poster?.userId);
    await deleteTestUser(applicant?.userId);
  });

  it("rejects creating a job with no title/description/location", async ({ task }) => {
    const { status, body } = await api("/api/jobs", {
      method: "POST",
      headers: { Authorization: `Bearer ${poster.token}` },
      body: {},
    });
    expect(status).toBe(400);
    expect(body.message).toMatch(/title/i);
    task.meta.detail = "POST /api/jobs with no fields -> 400, \"Job title is required.\"";
  });

  it("rejects an unauthenticated request to create a job", async ({ task }) => {
    const { status } = await api("/api/jobs", { method: "POST", body: { title: "x", description: "y", location: "z" } });
    expect(status).toBe(401);
    task.meta.detail = "POST /api/jobs with no token -> 401.";
  });

  it("rejects a past application deadline", async ({ task }) => {
    const { status, body } = await api("/api/jobs", {
      method: "POST",
      headers: { Authorization: `Bearer ${poster.token}` },
      body: { title: "DevTest Job", description: "A test job posting.", location: "Lucknow, India", applicationDeadline: "2020-01-01" },
    });
    expect(status).toBe(400);
    expect(body.message).toMatch(/past/i);
    task.meta.detail = "POST /api/jobs with applicationDeadline in the past -> 400.";
  });

  it("creates a job and it goes live immediately -- no admin approval gate", async ({ task }) => {
    const { status, body } = await api("/api/jobs", {
      method: "POST",
      headers: { Authorization: `Bearer ${poster.token}` },
      body: { title: `DevTest Job ${Date.now()}`, description: "A test job posting for automated testing.", location: "Lucknow, India" },
    });
    expect(status).toBe(201);
    expect(body.job.status).toBe("active");
    jobId = body.job.id;
    task.meta.detail = "POST /api/jobs with valid fields -> 201, status:\"active\" immediately -- unlike Masjid/Campaign, there is no draft -> submit -> admin-approve pipeline.";
  });

  it("the new job appears in public search immediately", async ({ task }) => {
    const { status, body } = await api(`/api/jobs/public?q=${encodeURIComponent("DevTest Job")}`);
    expect(status).toBe(200);
    expect(body.jobs.some((j) => j.id === jobId)).toBe(true);
    task.meta.detail = "GET /api/jobs/public?q=... -> the job is already visible, confirming no approval gate exists.";
  });

  it("a non-owner cannot update another user's job", async ({ task }) => {
    const { status } = await api(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${applicant.token}` },
      body: { title: "Hijacked" },
    });
    expect(status).toBe(404);
    task.meta.detail = "PATCH /api/jobs/:id as a different user -> 404 (scoped to the owner).";
  });

  it("the owner can close and reopen the job", async ({ task }) => {
    const close = await api(`/api/jobs/${jobId}/close`, { method: "POST", headers: { Authorization: `Bearer ${poster.token}` } });
    expect(close.status).toBe(200);
    expect(close.body.job.status).toBe("closed");

    const reopen = await api(`/api/jobs/${jobId}/reopen`, { method: "POST", headers: { Authorization: `Bearer ${poster.token}` } });
    expect(reopen.status).toBe(200);
    expect(reopen.body.job.status).toBe("active");
    task.meta.detail = "POST .../close -> status:\"closed\"; POST .../reopen -> back to \"active\". A simple toggle, distinct from the admin-only expired/deleted states.";
  });

  it("rejects an owner applying to their own job", async ({ task }) => {
    const { status, body } = await api(`/api/jobs/${jobId}/apply`, {
      method: "POST",
      headers: { Authorization: `Bearer ${poster.token}` },
      body: { coverNote: "Hiring myself" },
    });
    expect(status).toBe(400);
    expect(body.message).toMatch(/own job/i);
    task.meta.detail = "POST /api/jobs/:id/apply as the job's own owner -> 400 \"You can't apply to your own job posting.\"";
  });

  it("an applicant can apply without uploading a resume (falls back gracefully)", async ({ task }) => {
    const { status, body } = await api(`/api/jobs/${jobId}/apply`, {
      method: "POST",
      headers: { Authorization: `Bearer ${applicant.token}` },
      body: { coverNote: "DevTest application -- I am a great fit." },
    });
    expect(status).toBe(201);
    expect(body.application.status).toBe("applied");
    applicationId = body.application.id;
    task.meta.detail = "POST /api/jobs/:id/apply with no resume file -> 201, status:\"applied\" (falls back to the applicant's standing resumePath, which is null here -- no hard resume requirement).";
  });

  it("rejects a duplicate application from the same user", async ({ task }) => {
    const { status, body } = await api(`/api/jobs/${jobId}/apply`, {
      method: "POST",
      headers: { Authorization: `Bearer ${applicant.token}` },
      body: { coverNote: "Trying again" },
    });
    expect(status).toBe(409);
    expect(body.message).toMatch(/already applied/i);
    task.meta.detail = "A second POST /apply from the same user -> 409 \"You've already applied to this job.\" (unique jobId+applicantUserId constraint).";
  });

  it("the applicant can see their own application status", async ({ task }) => {
    const { status, body } = await api(`/api/jobs/${jobId}/my-application`, { headers: { Authorization: `Bearer ${applicant.token}` } });
    expect(status).toBe(200);
    expect(body.application.id).toBe(applicationId);
    task.meta.detail = "GET /api/jobs/:id/my-application -> returns the applicant's own application row.";
  });

  it("the poster can list applicants and see the new application", async ({ task }) => {
    const { status, body } = await api(`/api/jobs/${jobId}/applications`, { headers: { Authorization: `Bearer ${poster.token}` } });
    expect(status).toBe(200);
    expect(body.applications.some((a) => a.id === applicationId)).toBe(true);
    task.meta.detail = "GET /api/jobs/:id/applications as the poster -> the new application is listed.";
  });

  it("the poster can move the application to shortlisted", async ({ task }) => {
    const { status, body } = await api(`/api/jobs/${jobId}/applications/${applicationId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${poster.token}` },
      body: { status: "shortlisted" },
    });
    expect(status).toBe(200);
    expect(body.application.status).toBe("shortlisted");
    task.meta.detail = "PATCH .../applications/:appId {status:\"shortlisted\"} as the poster -> 200, application status updated.";
  });

  it("a non-poster cannot view or manage applicants for someone else's job", async ({ task }) => {
    const { status } = await api(`/api/jobs/${jobId}/applications`, { headers: { Authorization: `Bearer ${applicant.token}` } });
    expect(status).toBe(404);
    task.meta.detail = "GET /api/jobs/:id/applications as the applicant (not the poster) -> 404, applicant management is owner-only.";
  });

  it("rejects applying to a job that's been closed", async ({ task }) => {
    await api(`/api/jobs/${jobId}/close`, { method: "POST", headers: { Authorization: `Bearer ${poster.token}` } });
    const anotherApplicant = await registerAndVerify({ fullName: "DevTest JobApplicant2" });
    try {
      const { status, body } = await api(`/api/jobs/${jobId}/apply`, {
        method: "POST",
        headers: { Authorization: `Bearer ${anotherApplicant.token}` },
        body: { coverNote: "Too late" },
      });
      expect(status).toBe(400);
      expect(body.message).toMatch(/no longer accepting/i);
      task.meta.detail = "POST /apply on a status:\"closed\" job -> 400 \"This job is no longer accepting applications.\"";
    } finally {
      await deleteTestUser(anotherApplicant.userId);
      await api(`/api/jobs/${jobId}/reopen`, { method: "POST", headers: { Authorization: `Bearer ${poster.token}` } });
    }
  });

  it("admin can set the job to expired directly -- there is no automatic deadline enforcement", async ({ task }) => {
    const { token } = await adminAuth();
    const { status, body } = await api(`/api/admin/jobs/${jobId}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: { status: "expired" },
    });
    expect(status).toBe(200);
    expect(body.job.status).toBe("expired");
    task.meta.detail = "PATCH /api/admin/jobs/:id/status {status:\"expired\"} -> 200. Only an admin action ever produces \"expired\" -- applicationDeadline is a display/sort field, never enforced automatically.";
  });

  it("the owner can no longer edit the job once it's expired", async ({ task }) => {
    const { status } = await api(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${poster.token}` },
      body: { title: "Trying to edit an expired job" },
    });
    expect(status).toBe(400);
    task.meta.detail = "PATCH /api/jobs/:id while status:\"expired\" -> 400. Owner edits only work while active/closed.";
  });

  it("admin hard-deletes the job", async ({ task }) => {
    const { token } = await adminAuth();
    const { status } = await api(`/api/admin/jobs/${jobId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    expect(status).toBe(200);

    const getAfter = await api(`/api/jobs/${jobId}`, { headers: { Authorization: `Bearer ${poster.token}` } });
    expect(getAfter.status).toBe(404);
    jobId = null;
    task.meta.detail = "DELETE /api/admin/jobs/:id -> 200, and the job is genuinely gone (public GET now 404s).";
  });
});
