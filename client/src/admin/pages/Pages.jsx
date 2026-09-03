import React, { useEffect, useState } from "react";
import { NavLink, Navigate, useNavigate, useParams } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import RichTextEditor from "../components/RichTextEditor.jsx";
import adminApi from "../services/adminApi.js";
import { formatDate } from "../../utils/formatDateTime.js";

function Toggle({ on, onClick, disabled }) {
  return <button type="button" className={`amx-toggle${on ? " on" : ""}`} onClick={onClick} disabled={disabled} aria-pressed={on} />;
}

function NewPageModal({ onCancel, onCreated }) {
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return setError("Page title is required.");
    setSaving(true);
    setError("");
    try {
      const { data } = await adminApi.post("/pages", { defaultTitle: title.trim() });
      onCreated(data.page);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't create this page.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <h3>New Page</h3>
        <form onSubmit={submit} style={{ marginTop: 16 }}>
          <div className="amx-form-group">
            <label htmlFor="page-title">Page Title</label>
            <input id="page-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Help Center" autoFocus />
          </div>
          {error && (
            <div className="amx-field-error">
              <Icon name="info" size={14} />
              {error}
            </div>
          )}
          <button type="submit" className="amx-btn amx-btn-primary" style={{ width: "100%", marginTop: 12 }} disabled={saving}>
            {saving ? "Creating…" : "Create Page"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ConfirmDeletePageModal({ page, onCancel, onConfirm, busy }) {
  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <div className="amx-modal-danger-icon"><Icon name="trash" size={22} /></div>
        <h3 style={{ textAlign: "center" }}>Delete "{page.defaultTitle}"?</h3>
        <p className="amx-modal-sub" style={{ textAlign: "center" }}>
          This removes the page and its content in every language. If a public URL points at this page, it will start 404ing. This can't be undone.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="amx-btn amx-btn-outline" style={{ flex: 1 }} onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="amx-btn amx-btn-danger" style={{ flex: 1 }} onClick={onConfirm} disabled={busy}>{busy ? "Deleting…" : "Delete"}</button>
        </div>
      </div>
    </div>
  );
}

function PageEditor({ page, languages, onPageUpdated, onPageDeleted }) {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeLang, setActiveLang] = useState(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2400); };

  useEffect(() => {
    setLoading(true);
    setError("");
    adminApi
      .get(`/pages/${page.id}/content`)
      .then(({ data }) => {
        setContent(data.content);
        const defaultLang = languages.find((l) => l.isDefault)?.code || languages[0]?.code;
        setActiveLang((data.content[defaultLang] ? defaultLang : languages[0]?.code) || defaultLang);
      })
      .catch((err) => setError(err.response?.data?.message || "Couldn't load this page's content."))
      .finally(() => setLoading(false));
  }, [page.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!content || !activeLang) return;
    setDraftTitle(content[activeLang]?.title || "");
    setDraftBody(content[activeLang]?.bodyHtml || "");
  }, [content, activeLang]);

  const original = content?.[activeLang];
  const dirty = draftTitle !== (original?.title || "") || draftBody !== (original?.bodyHtml || "");

  const switchLang = (code) => {
    if (code === activeLang) return;
    if (dirty && !window.confirm("You have unsaved changes on this language. Discard them?")) return;
    setActiveLang(code);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const { data } = await adminApi.put(`/pages/${page.id}/content/${activeLang}`, { title: draftTitle, bodyHtml: draftBody });
      setContent((c) => ({ ...c, [activeLang]: data.content }));
      showToast("Page content saved.");
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save this page.");
    } finally {
      setSaving(false);
    }
  };

  const renamePage = async (defaultTitle) => {
    try {
      const { data } = await adminApi.patch(`/pages/${page.id}`, { defaultTitle });
      onPageUpdated(data.page);
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't rename this page.");
    }
  };

  const toggleActive = async () => {
    try {
      const { data } = await adminApi.patch(`/pages/${page.id}`, { isActive: !page.isActive });
      onPageUpdated(data.page);
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't update this page.");
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await adminApi.delete(`/pages/${page.id}`);
      onPageDeleted(page.id);
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't delete this page.");
      setDeleting(false);
    }
  };

  const activeLanguage = languages.find((l) => l.code === activeLang);

  return (
    <>
      <div className="amx-panel-head">
        <div>
          <input
            className="amx-inline-title-input"
            value={page.defaultTitle}
            onChange={(e) => onPageUpdated({ ...page, defaultTitle: e.target.value })}
            onBlur={(e) => e.target.value.trim() && renamePage(e.target.value.trim())}
          />
          <div className="amx-panel-sub">
            /{page.slug === "terms-of-use" ? "terms" : page.slug === "privacy-policy" ? "privacy" : page.slug === "cookie-policy" ? "cookie-policy" : `pages/${page.slug}`}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span className="amx-panel-sub">{page.isActive ? "Active" : "Inactive"}</span>
          <Toggle on={page.isActive} onClick={toggleActive} />
          <button className="amx-icon-action" aria-label="Delete page" title="Delete page" onClick={() => setDeleteConfirm(true)}>
            <Icon name="trash" />
          </button>
        </div>
      </div>

      <div className="amx-lang-tabs">
        {languages.map((l) => (
          <button
            key={l.code}
            type="button"
            className={`amx-lang-tab${activeLang === l.code ? " active" : ""}${content && !content[l.code] ? " empty" : ""}`}
            onClick={() => switchLang(l.code)}
          >
            {l.nativeName}
            {content && !content[l.code] && <span className="amx-lang-tab-dot" title="No content yet" />}
          </button>
        ))}
      </div>

      {error && (
        <div className="amx-form-error" style={{ margin: "0 0 16px" }}>
          <Icon name="info" size={17} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="amx-empty">
          <Icon name="fileText" />
          <strong>Loading page content…</strong>
        </div>
      ) : (
        <>
          <div className="amx-form-group">
            <label>Page Title ({activeLanguage?.name})</label>
            <input type="text" dir={activeLanguage?.direction} value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} placeholder={page.defaultTitle} />
          </div>

          <div className="amx-form-group">
            <label>Content ({activeLanguage?.name})</label>
            <RichTextEditor value={draftBody} onChange={setDraftBody} direction={activeLanguage?.direction || "ltr"} placeholder="Write this page's content…" />
          </div>

          <div className="amx-editor-actions">
            {original?.updatedAt && <span className="amx-panel-sub">Last saved {formatDate(original.updatedAt)}</span>}
            <button className="amx-btn amx-btn-primary" onClick={save} disabled={saving || !dirty}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </>
      )}

      {toast && <div className="amx-toast"><Icon name="check" />{toast}</div>}

      {deleteConfirm && (
        <ConfirmDeletePageModal
          page={page}
          busy={deleting}
          onCancel={() => setDeleteConfirm(false)}
          onConfirm={confirmDelete}
        />
      )}
    </>
  );
}

function Pages() {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const [pages, setPages] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newModalOpen, setNewModalOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([adminApi.get("/pages"), adminApi.get("/languages")])
      .then(([pagesRes, langsRes]) => {
        setPages(pagesRes.data.pages);
        setLanguages(langsRes.data.languages.filter((l) => l.isActive));
      })
      .catch((err) => setError(err.response?.data?.message || "Couldn't load pages."))
      .finally(() => setLoading(false));
  }, []);

  const onPageCreated = (page) => {
    setPages((ps) => [...ps, { ...page, contentLanguages: [] }]);
    setNewModalOpen(false);
    navigate(`/admin/pages/${page.id}`);
  };

  const onPageUpdated = (page) => {
    setPages((ps) => ps.map((p) => (p.id === page.id ? { ...p, ...page } : p)));
  };

  const onPageDeleted = (id) => {
    const remaining = pages.filter((p) => p.id !== id);
    setPages(remaining);
    navigate(remaining[0] ? `/admin/pages/${remaining[0].id}` : "/admin/pages", { replace: true });
  };

  if (loading) {
    return (
      <div className="amx-empty">
        <Icon name="fileText" />
        <strong>Loading pages…</strong>
      </div>
    );
  }

  if (error) {
    return (
      <div className="amx-form-error">
        <Icon name="info" size={17} />
        {error}
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <>
        <div className="amx-page-head">
          <div>
            <span className="amx-crumb">Administration</span>
            <h1>Pages</h1>
            <p>Manage the full content of static pages, per language</p>
          </div>
        </div>
        <div className="amx-empty">
          <Icon name="fileText" />
          <strong>No pages yet</strong>
          <span>Create your first static page — Terms of Use, Privacy Policy, or anything else.</span>
          <button className="amx-btn amx-btn-primary" style={{ marginTop: 14 }} onClick={() => setNewModalOpen(true)}>
            <Icon name="plus" size={15} /> New Page
          </button>
        </div>
        {newModalOpen && <NewPageModal onCancel={() => setNewModalOpen(false)} onCreated={onPageCreated} />}
      </>
    );
  }

  if (!pageId || !pages.some((p) => String(p.id) === pageId)) {
    return <Navigate to={`/admin/pages/${pages[0].id}`} replace />;
  }

  const activePage = pages.find((p) => String(p.id) === pageId);

  return (
    <>
      <div className="amx-page-head">
        <div>
          <span className="amx-crumb">Administration</span>
          <h1>Pages</h1>
          <p>Manage the full content of static pages, per language — separate from the Translations module, which covers UI strings</p>
        </div>
        <button className="amx-btn amx-btn-primary" onClick={() => setNewModalOpen(true)}>
          <Icon name="plus" size={15} /> New Page
        </button>
      </div>

      <div className="amx-settings-layout">
        <nav className="amx-settings-nav">
          {pages.map((p) => (
            <NavLink key={p.id} to={`/admin/pages/${p.id}`} className={({ isActive }) => (isActive ? "active" : "")}>
              <Icon name="fileText" />
              {p.defaultTitle}
              {!p.isActive && <span className="amx-nav-badge">Inactive</span>}
            </NavLink>
          ))}
        </nav>

        <div className="amx-card amx-panel">
          {languages.length === 0 ? (
            <div className="amx-empty">
              <Icon name="globe" />
              <strong>No active languages</strong>
              <span>Activate at least one language under Meta → Languages first.</span>
            </div>
          ) : (
            <PageEditor key={activePage.id} page={activePage} languages={languages} onPageUpdated={onPageUpdated} onPageDeleted={onPageDeleted} />
          )}
        </div>
      </div>

      {newModalOpen && <NewPageModal onCancel={() => setNewModalOpen(false)} onCreated={onPageCreated} />}
    </>
  );
}

export default Pages;
