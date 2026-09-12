import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import RichTextEditor from "../components/RichTextEditor.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import adminApi from "../services/adminApi.js";
import { formatDate } from "../../utils/formatDateTime.js";

// This app's real status set (draft/in_review/completed/needs_update)
// doesn't line up 1:1 with StatusBadge's known keys, so each maps onto the
// closest existing color/label pairing rather than adding new badge styles
// for a single admin-only module.
const STATUS_BADGE = {
  draft: { status: "draft", label: "Draft" },
  in_review: { status: "under_review", label: "In Review" },
  completed: { status: "completed", label: "Completed" },
  needs_update: { status: "changes_requested", label: "Needs Update" },
};

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "in_review", label: "In Review" },
  { value: "completed", label: "Completed" },
  { value: "needs_update", label: "Needs Update" },
];

function NewModuleModal({ onCancel, onCreated }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return setError("Module title is required.");
    setSaving(true);
    setError("");
    try {
      const { data } = await adminApi.post("/developer/modules", { title: title.trim(), category: category.trim() || null });
      onCreated(data.module);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't create this module.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <h3>New Module</h3>
        <form onSubmit={submit} style={{ marginTop: 16 }}>
          <div className="amx-form-group">
            <label htmlFor="devdoc-title">Module Title</label>
            <input id="devdoc-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Notifications" autoFocus />
          </div>
          <div className="amx-form-group">
            <label htmlFor="devdoc-category">Category</label>
            <input id="devdoc-category" type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Community" />
          </div>
          {error && (
            <div className="amx-field-error">
              <Icon name="info" size={14} />
              {error}
            </div>
          )}
          <button type="submit" className="amx-btn amx-btn-primary" style={{ width: "100%", marginTop: 12 }} disabled={saving}>
            {saving ? "Creating…" : "Create Module"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ConfirmDeleteModuleModal({ module, onCancel, onConfirm, busy }) {
  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <div className="amx-modal-danger-icon"><Icon name="trash" size={22} /></div>
        <h3 style={{ textAlign: "center" }}>Delete "{module.title}"?</h3>
        <p className="amx-modal-sub" style={{ textAlign: "center" }}>
          This removes the module, all its sections, and its full version history. This can't be undone.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="amx-btn amx-btn-outline" style={{ flex: 1 }} onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="amx-btn amx-btn-danger" style={{ flex: 1 }} onClick={onConfirm} disabled={busy}>{busy ? "Deleting…" : "Delete"}</button>
        </div>
      </div>
    </div>
  );
}

function VersionHistory({ moduleId }) {
  const [versions, setVersions] = useState(null);

  useEffect(() => {
    adminApi.get(`/developer/modules/${moduleId}/versions`).then(({ data }) => setVersions(data.versions));
  }, [moduleId]);

  if (versions === null) return <p className="amx-panel-sub">Loading history…</p>;
  if (versions.length === 0) return <p className="amx-panel-sub">No saved versions yet — this module hasn't been saved.</p>;

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {versions.map((v) => (
        <li key={v.id} style={{ padding: "10px 0", borderTop: "1px solid var(--a-border)" }}>
          <strong>Version {v.versionNumber}</strong>
          <span className="amx-panel-sub" style={{ marginLeft: 8 }}>{formatDate(v.createdAt)} · {v.updatedByName || "Unknown"}</span>
          {v.changeSummary && <p style={{ margin: "4px 0 0", fontSize: 13 }}>{v.changeSummary}</p>}
        </li>
      ))}
    </ul>
  );
}

function ChangeSummaryBar({ onCancel, onConfirm, saving }) {
  const [summary, setSummary] = useState("");
  return (
    <div className="amx-form-group" style={{ marginTop: 0 }}>
      <label>What changed? (recorded in version history)</label>
      <div style={{ display: "flex", gap: 10 }}>
        <input type="text" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="e.g. Added API request/response examples" autoFocus style={{ flex: 1 }} />
        <button type="button" className="amx-btn amx-btn-outline" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="button" className="amx-btn amx-btn-primary" onClick={() => onConfirm(summary.trim())} disabled={saving}>
          {saving ? "Saving…" : "Confirm & Save"}
        </button>
      </div>
    </div>
  );
}

function ModuleEditor({ module, onModuleUpdated, onModuleDeleted }) {
  const [sections, setSections] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [savePrompt, setSavePrompt] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [initialSections, setInitialSections] = useState(null);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2400); };

  useEffect(() => {
    setLoading(true);
    setError("");
    setShowHistory(false);
    setSavePrompt(false);
    adminApi
      .get(`/developer/modules/${module.id}`)
      .then(({ data }) => {
        setSections(data.sections);
        setInitialSections(data.sections);
      })
      .catch((err) => setError(err.response?.data?.message || "Couldn't load this module's documentation."))
      .finally(() => setLoading(false));
  }, [module.id]);

  const dirty = useMemo(() => JSON.stringify(sections) !== JSON.stringify(initialSections), [sections, initialSections]);

  const updateSection = (idx, patch) => {
    setSections((secs) => secs.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const removeSection = (idx) => {
    if (!window.confirm("Remove this section? It's gone once you save.")) return;
    setSections((secs) => secs.filter((_, i) => i !== idx));
  };

  const addSection = () => {
    setSections((secs) => [...secs, { title: "New Section", bodyHtml: "" }]);
  };

  const doSave = async (changeSummary) => {
    setSaving(true);
    setError("");
    try {
      const { data } = await adminApi.put(`/developer/modules/${module.id}/sections`, { sections, changeSummary });
      setSections(data.sections);
      setInitialSections(data.sections);
      setSavePrompt(false);
      showToast("Documentation saved.");
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save this module's documentation.");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (status) => {
    try {
      const { data } = await adminApi.patch(`/developer/modules/${module.id}`, { status });
      onModuleUpdated(data.module);
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't update status.");
    }
  };

  const renameModule = async (title) => {
    try {
      const { data } = await adminApi.patch(`/developer/modules/${module.id}`, { title });
      onModuleUpdated(data.module);
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't rename this module.");
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await adminApi.delete(`/developer/modules/${module.id}`);
      onModuleDeleted(module.id);
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't delete this module.");
      setDeleting(false);
    }
  };

  const badge = STATUS_BADGE[module.status] || STATUS_BADGE.draft;

  return (
    <>
      <div className="amx-panel-head">
        <div>
          <input
            className="amx-inline-title-input"
            value={module.title}
            onChange={(e) => onModuleUpdated({ ...module, title: e.target.value })}
            onBlur={(e) => e.target.value.trim() && renameModule(e.target.value.trim())}
          />
          <div className="amx-panel-sub">{module.category || "Uncategorized"}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <select value={module.status} onChange={(e) => changeStatus(e.target.value)}>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <StatusBadge status={badge.status} label={badge.label} />
          <button className="amx-icon-action" aria-label="Version history" title="Version history" onClick={() => setShowHistory((v) => !v)}>
            <Icon name="clock" />
          </button>
          <button className="amx-icon-action" aria-label="Delete module" title="Delete module" onClick={() => setDeleteConfirm(true)}>
            <Icon name="trash" />
          </button>
        </div>
      </div>

      {error && (
        <div className="amx-form-error" style={{ margin: "0 0 16px" }}>
          <Icon name="info" size={17} />
          {error}
        </div>
      )}

      {showHistory && (
        <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid var(--a-border)" }}>
          <h4 style={{ marginBottom: 8 }}>Version History</h4>
          <VersionHistory moduleId={module.id} />
        </div>
      )}

      {loading ? (
        <div className="amx-empty">
          <Icon name="fileText" />
          <strong>Loading documentation…</strong>
        </div>
      ) : (
        <>
          {sections.map((section, idx) => (
            <div key={section.id || `new-${idx}`} style={{ marginTop: idx === 0 ? 0 : 24, paddingTop: idx === 0 ? 0 : 24, borderTop: idx === 0 ? "none" : "1px solid var(--a-border)" }}>
              <div className="amx-form-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label>Section Title</label>
                  <button type="button" className="amx-icon-action" aria-label="Remove section" title="Remove section" onClick={() => removeSection(idx)}>
                    <Icon name="x" size={14} />
                  </button>
                </div>
                <input type="text" value={section.title} onChange={(e) => updateSection(idx, { title: e.target.value })} />
              </div>
              <div className="amx-form-group">
                <RichTextEditor value={section.bodyHtml} onChange={(html) => updateSection(idx, { bodyHtml: html })} direction="ltr" placeholder="Document this section…" />
              </div>
            </div>
          ))}

          <button type="button" className="amx-btn amx-btn-outline" style={{ marginTop: 16 }} onClick={addSection}>
            <Icon name="plus" size={14} /> Add Section
          </button>

          <div className="amx-editor-actions" style={{ flexDirection: "column", alignItems: "stretch" }}>
            {savePrompt ? (
              <ChangeSummaryBar onCancel={() => setSavePrompt(false)} onConfirm={doSave} saving={saving} />
            ) : (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                <span className="amx-panel-sub">{dirty ? "Unsaved changes" : "No unsaved changes"}</span>
                <button className="amx-btn amx-btn-primary" onClick={() => setSavePrompt(true)} disabled={!dirty}>
                  Save Documentation
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {toast && <div className="amx-toast"><Icon name="check" />{toast}</div>}

      {deleteConfirm && (
        <ConfirmDeleteModuleModal
          module={module}
          busy={deleting}
          onCancel={() => setDeleteConfirm(false)}
          onConfirm={confirmDelete}
        />
      )}
    </>
  );
}

function SearchResults({ query, onSelect }) {
  const [results, setResults] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      adminApi.get("/developer/search", { params: { q: query } }).then(({ data }) => setResults(data.results));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  if (results === null) return <p className="amx-panel-sub" style={{ padding: "12px 16px" }}>Searching…</p>;
  if (results.length === 0) return <p className="amx-panel-sub" style={{ padding: "12px 16px" }}>No matches for "{query}".</p>;

  return (
    <div style={{ padding: "4px 0" }}>
      {results.map((r, i) => (
        <button
          key={i}
          type="button"
          style={{ textAlign: "left", height: "auto", flexDirection: "column", alignItems: "flex-start", gap: 2, padding: "8px 12px" }}
          onClick={() => onSelect(r.moduleId)}
        >
          <strong>{r.moduleTitle}</strong>
          {r.sectionTitle && <span className="amx-panel-sub" style={{ display: "block" }}>{r.sectionTitle}</span>}
          {r.snippet && <span className="amx-panel-sub" style={{ display: "block", fontSize: 12 }}>{r.snippet}</span>}
        </button>
      ))}
    </div>
  );
}

function Developer() {
  const { moduleKey } = useParams();
  const navigate = useNavigate();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setLoading(true);
    adminApi
      .get("/developer/modules")
      .then(({ data }) => setModules(data.modules))
      .catch((err) => setError(err.response?.data?.message || "Couldn't load modules."))
      .finally(() => setLoading(false));
  }, []);

  const onModuleCreated = (module) => {
    setModules((ms) => [...ms, module]);
    setNewModalOpen(false);
    navigate(`/admin/developer/${module.key}`);
  };

  const onModuleUpdated = (module) => {
    setModules((ms) => ms.map((m) => (m.id === module.id ? { ...m, ...module } : m)));
  };

  const onModuleDeleted = (id) => {
    const remaining = modules.filter((m) => m.id !== id);
    setModules(remaining);
    navigate(remaining[0] ? `/admin/developer/${remaining[0].key}` : "/admin/developer", { replace: true });
  };

  const onSearchSelect = (moduleId) => {
    const m = modules.find((mm) => mm.id === moduleId);
    if (m) navigate(`/admin/developer/${m.key}`);
    setQuery("");
  };

  const categorized = useMemo(() => {
    const groups = new Map();
    for (const m of modules) {
      const cat = m.category || "Uncategorized";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(m);
    }
    return [...groups.entries()];
  }, [modules]);

  if (loading) {
    return (
      <div className="amx-empty">
        <Icon name="fileText" />
        <strong>Loading Developer documentation…</strong>
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

  if (modules.length === 0) {
    return (
      <>
        <div className="amx-page-head">
          <div>
            <span className="amx-crumb">Administration</span>
            <h1>Developer</h1>
            <p>The living technical specification of the application — architecture, database, APIs, and business logic, module by module.</p>
          </div>
        </div>
        <div className="amx-empty">
          <Icon name="code" />
          <strong>No modules yet</strong>
          <span>Create your first module to start documenting.</span>
          <button className="amx-btn amx-btn-primary" style={{ marginTop: 14 }} onClick={() => setNewModalOpen(true)}>
            <Icon name="plus" size={15} /> New Module
          </button>
        </div>
        {newModalOpen && <NewModuleModal onCancel={() => setNewModalOpen(false)} onCreated={onModuleCreated} />}
      </>
    );
  }

  if (!moduleKey || !modules.some((m) => m.key === moduleKey)) {
    return <Navigate to={`/admin/developer/${modules[0].key}`} replace />;
  }

  const activeModule = modules.find((m) => m.key === moduleKey);

  return (
    <>
      <div className="amx-page-head">
        <div>
          <span className="amx-crumb">Administration</span>
          <h1>Developer</h1>
          <p>The living technical specification of the application — architecture, database, APIs, and business logic, module by module.</p>
        </div>
        <button className="amx-btn amx-btn-primary" onClick={() => setNewModalOpen(true)}>
          <Icon name="plus" size={15} /> New Module
        </button>
      </div>

      <div className="amx-settings-layout">
        <nav className="amx-settings-nav">
          <div className="amx-form-group" style={{ padding: "0 4px 12px" }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search modules, tables, APIs…"
            />
          </div>

          {query.trim() ? (
            <SearchResults query={query.trim()} onSelect={onSearchSelect} />
          ) : (
            categorized.map(([category, mods]) => (
              <div key={category} style={{ marginBottom: 8 }}>
                <div className="amx-panel-sub" style={{ padding: "8px 12px 4px", textTransform: "uppercase", letterSpacing: ".04em", fontSize: 11 }}>{category}</div>
                {mods.map((m) => {
                  const badge = STATUS_BADGE[m.status] || STATUS_BADGE.draft;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className={m.key === moduleKey ? "active" : ""}
                      onClick={() => navigate(`/admin/developer/${m.key}`)}
                    >
                      {m.title}
                      <StatusBadge status={badge.status} label={badge.label} />
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </nav>

        <div className="amx-card amx-panel">
          <ModuleEditor key={activeModule.id} module={activeModule} onModuleUpdated={onModuleUpdated} onModuleDeleted={onModuleDeleted} />
        </div>
      </div>

      {newModalOpen && <NewModuleModal onCancel={() => setNewModalOpen(false)} onCreated={onModuleCreated} />}
    </>
  );
}

export default Developer;
