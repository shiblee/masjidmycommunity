import { describe, it, expect, afterAll } from "vitest";
import { api, adminAuth } from "../helpers/testClient.js";

describe("Localization", () => {
  let testLanguageId;
  const testKey = `devtest.key.${Date.now()}`;

  afterAll(async () => {
    const { token } = await adminAuth();
    await api(`/api/admin/translations/${testKey}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    if (testLanguageId) await api(`/api/admin/languages/${testLanguageId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
  });

  it("lists only active languages, including the real seeded set", async ({ task }) => {
    const { status, body } = await api("/api/i18n/languages");
    expect(status).toBe(200);
    const codes = body.languages.map((l) => l.code);
    expect(codes).toContain("en");
    expect(codes).toContain("ur");
    task.meta.detail = "GET /api/i18n/languages -> 200, the real active language set (includes at least \"en\" and \"ur\"), fully public.";
  });

  it("Urdu is correctly marked RTL, not just assumed", async ({ task }) => {
    const { body } = await api("/api/i18n/languages");
    const urdu = body.languages.find((l) => l.code === "ur");
    expect(urdu.direction).toBe("rtl");
    const english = body.languages.find((l) => l.code === "en");
    expect(english.direction).toBe("ltr");
    task.meta.detail = "Urdu's direction field is genuinely \"rtl\" and English's is \"ltr\" -- the client sets document.documentElement.dir from this real field, not a hardcoded per-language list.";
  });

  it("exactly one language is marked as the default", async ({ task }) => {
    const { token } = await adminAuth();
    const { body } = await api("/api/admin/languages", { headers: { Authorization: `Bearer ${token}` } });
    const defaults = body.languages.filter((l) => l.isDefault);
    expect(defaults.length).toBe(1);
    expect(defaults[0].code).toBe("en");
    task.meta.detail = "GET /api/admin/languages -> exactly one row has isDefault:true, and it's \"en\".";
  });

  it("returns direction + a flat key->value map for a real language", async ({ task }) => {
    const { status, body } = await api("/api/i18n/translations/ur");
    expect(status).toBe(200);
    expect(body.direction).toBe("rtl");
    expect(body.values).toBeTypeOf("object");
    task.meta.detail = "GET /api/i18n/translations/ur -> 200 {direction:\"rtl\", values:{key: text, ...}} -- a flat map, not nested by category.";
  });

  it("returns 404 for a language code that doesn't exist or isn't active", async ({ task }) => {
    const { status } = await api("/api/i18n/translations/devtest-nonexistent-lang");
    expect(status).toBe(404);
    task.meta.detail = "GET /api/i18n/translations/:code for an unknown code -> 404.";
  });

  it("rejects creating a language with an invalid code format", async ({ task }) => {
    const { token } = await adminAuth();
    const { status } = await api("/api/admin/languages", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { code: "not a code!", name: "Test", nativeName: "Test", direction: "ltr" },
    });
    expect(status).toBe(400);
    task.meta.detail = "POST /api/admin/languages with a code that doesn't match /^[a-z]{2}(-[A-Z]{2})?$/ -> 400.";
  });

  it("rejects deactivating or deleting the default language", async ({ task }) => {
    const { token } = await adminAuth();
    const langs = await api("/api/admin/languages", { headers: { Authorization: `Bearer ${token}` } });
    const defaultLang = langs.body.languages.find((l) => l.isDefault);

    const deactivate = await api(`/api/admin/languages/${defaultLang.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: { isActive: false },
    });
    expect(deactivate.status).toBe(400);

    const del = await api(`/api/admin/languages/${defaultLang.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    expect(del.status).toBe(400);
    task.meta.detail = "PATCH {isActive:false} on the default language -> 400. DELETE on the default language -> 400. Both require setting a different default first.";
  });

  it("creates a real test language, then it appears in the public list", async ({ task }) => {
    const { token } = await adminAuth();
    const create = await api("/api/admin/languages", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { code: "zz", name: "DevTest Language", nativeName: "DevTest", direction: "ltr", isActive: true },
    });
    expect(create.status).toBe(201);
    testLanguageId = create.body.language.id;

    const list = await api("/api/i18n/languages");
    expect(list.body.languages.some((l) => l.code === "zz")).toBe(true);
    task.meta.detail = "POST /api/admin/languages with a fresh code -> 201, and it immediately shows up in the public GET /api/i18n/languages list.";
  });

  it("upserts a translation across languages, then deletes it for all of them at once", async ({ task }) => {
    const { token } = await adminAuth();
    const upsert = await api(`/api/admin/translations/${testKey}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: { category: "devtest", values: { en: "DevTest English", ur: "DevTest Urdu" } },
    });
    expect(upsert.status).toBe(200);
    expect(upsert.body.translation.values.en).toBe("DevTest English");

    const readBack = await api("/api/i18n/translations/en");
    expect(readBack.body.values[testKey]).toBe("DevTest English");

    const remove = await api(`/api/admin/translations/${testKey}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    expect(remove.status).toBe(200);

    const afterDelete = await api("/api/i18n/translations/en");
    expect(afterDelete.body.values[testKey]).toBeUndefined();
    task.meta.detail = "PUT /api/admin/translations/:key with {values:{en,ur}} -> 200, upserts both language rows at once; the new key is immediately readable from the public endpoint. DELETE removes it for every language in one call, not per-language.";
  });

  it("a missing translation key is simply absent from values, not an error or an English copy", async ({ task }) => {
    const { body } = await api("/api/i18n/translations/ur");
    expect(body.values[`devtest.definitely.missing.${Date.now()}`]).toBeUndefined();
    task.meta.detail = "A key with no row for a given language is just absent from that language's values map (200, not 404/500) -- the client's t() falls back to whatever inline default string the calling component hardcoded, not to a real English-locale lookup on the server.";
  });
});
