import { describe, it, expect, afterAll } from "vitest";
import { api, adminAuth, uniqueEmail } from "../helpers/testClient.js";

// The public submission endpoint deliberately returns only {sent, reference}
// -- never the numeric id -- so every admin-side call in this file first
// resolves the real id via a reference search, the same way a real support
// agent would look one up from the reference a submitter is given.
async function findIdByReference(reference, token) {
  const { body } = await api(`/api/admin/contact-inquiries?q=${reference}`, { headers: { Authorization: `Bearer ${token}` } });
  return body.contacts[0].id;
}

describe("Contact Us", () => {
  const createdIds = [];

  afterAll(async () => {
    const { token } = await adminAuth();
    for (const id of createdIds) {
      await api(`/api/admin/contact-inquiries/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    }
  });

  it("rejects a message under 10 characters", async ({ task }) => {
    const { status } = await api("/api/contact", { method: "POST", body: { fullName: "DevTest", email: uniqueEmail("contact"), message: "short" } });
    expect(status).toBe(400);
    task.meta.detail = "POST /api/contact with a message under 10 chars -> 400.";
  });

  it("rejects an invalid email", async ({ task }) => {
    const { status } = await api("/api/contact", { method: "POST", body: { fullName: "DevTest", email: "nope", message: "A real inquiry message here." } });
    expect(status).toBe(400);
    task.meta.detail = "POST /api/contact with a malformed email -> 400.";
  });

  it("falls back to a default topic rather than rejecting an invalid one", async ({ task }) => {
    const { status, body } = await api("/api/contact", {
      method: "POST",
      body: { fullName: "DevTest Contact", email: uniqueEmail("contact"), topic: "DevTest-Nonexistent-Topic-XYZ", message: "An automated test inquiry message." },
    });
    expect(status).toBe(201);
    expect(body.sent).toBe(true);
    expect(body.reference).toMatch(/^CONTACT-/);

    const { token } = await adminAuth();
    const id = await findIdByReference(body.reference, token);
    const inquiry = await api(`/api/admin/contact-inquiries/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    expect(inquiry.body.contact.topic).not.toBe("DevTest-Nonexistent-Topic-XYZ");
    createdIds.push(id);
    task.meta.detail = "POST /api/contact with an unrecognized topic string -> 201 anyway, silently falling back to the first active ContactTopic (or \"General Inquiry\"). There is no 400 for a bad topic value.";
  });

  it("requires no authentication at all -- fully anonymous by design", async ({ task }) => {
    const { status, body } = await api("/api/contact", {
      method: "POST",
      body: { fullName: "DevTest Anon Contact", email: uniqueEmail("contact"), message: "Another automated test inquiry, no token sent." },
    });
    expect(status).toBe(201);
    expect(body.sent).toBe(true);
    expect(body.reference).toMatch(/^CONTACT-/);

    const { token } = await adminAuth();
    const id = await findIdByReference(body.reference, token);
    const inquiry = await api(`/api/admin/contact-inquiries/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    expect(inquiry.body.contact.status).toBe("open");
    createdIds.push(id);
    task.meta.detail = "POST /api/contact -> 201 {sent:true, reference} -- deliberately no numeric id in the public response. Unlike Concerns, there's no optionalAuth here at all -- no userId column exists on ContactMessage even when the submitter happens to be logged in.";
  });

  it("rejects an unauthenticated request to list inquiries as admin", async ({ task }) => {
    const { status } = await api("/api/admin/contact-inquiries");
    expect(status).toBe(401);
    task.meta.detail = "GET /api/admin/contact-inquiries with no token -> 401.";
  });

  it("marking in-progress works once from open, then rejects a second call", async ({ task }) => {
    const { token } = await adminAuth();
    const id = createdIds[0];
    const first = await api(`/api/admin/contact-inquiries/${id}/in-progress`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    expect(first.status).toBe(200);
    expect(first.body.contact.status).toBe("in_progress");

    const second = await api(`/api/admin/contact-inquiries/${id}/in-progress`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    expect(second.status).toBe(400);
    task.meta.detail = "POST .../in-progress -> 200 the first time (open -> in_progress); the same call again -> 400, \"Only an open inquiry can be marked in progress.\"";
  });

  it("rejects reopening an inquiry that isn't closed", async ({ task }) => {
    const { token } = await adminAuth();
    const { status, body } = await api(`/api/admin/contact-inquiries/${createdIds[0]}/reopen`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    expect(status).toBe(400);
    expect(body.message).toMatch(/closed/i);
    task.meta.detail = "POST .../reopen on a status other than \"closed\" -> 400. Real, discovered contrast with Concerns: Contact's reopen only accepts a starting state of exactly \"closed\", where Concern's reopen accepts either \"resolved\" or \"closed\".";
  });

  it("replying transitions open straight to in_progress and is the only submitter-facing email", async ({ task }) => {
    const { token } = await adminAuth();
    const id = createdIds[1];
    const { status, body } = await api(`/api/admin/contact-inquiries/${id}/reply`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { message: "DevTest reply to this inquiry." },
    });
    expect(status).toBe(200);
    expect(body.contact.status).toBe("in_progress");
    task.meta.detail = "POST .../reply -> 200, status moves open -> in_progress in the same call. This is the only admin action that actually emails the submitter and awaits that send -- a failed send would leave the status unchanged, unlike close's fire-and-forget email.";
  });

  it("closing records who/when/why, and hard-delete cleans it up", async ({ task }) => {
    const { token } = await adminAuth();
    const id = createdIds[1];
    const close = await api(`/api/admin/contact-inquiries/${id}/close`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { note: "DevTest closing remarks." },
    });
    expect(close.status).toBe(200);
    expect(close.body.contact.status).toBe("closed");
    expect(close.body.contact.closedBy).toBeTruthy();
    expect(close.body.contact.closingRemarks).toBe("DevTest closing remarks.");

    const del = await api(`/api/admin/contact-inquiries/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    expect(del.status).toBe(200);
    const getAfter = await api(`/api/admin/contact-inquiries/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    expect(getAfter.status).toBe(404);
    createdIds.splice(createdIds.indexOf(id), 1);
    task.meta.detail = "POST .../close -> 200, closedBy/closedAt/closingRemarks set. DELETE /api/admin/contact-inquiries/:id -> 200, genuinely gone -- another hard-delete endpoint added specifically so this suite can clean up after itself.";
  });
});
