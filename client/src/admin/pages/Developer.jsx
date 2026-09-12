import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import adminApi from "../services/adminApi.js";
import { formatDate } from "../../utils/formatDateTime.js";

// A read-only technical wiki, not a CMS: no add/edit/delete/save controls
// anywhere in this file. The only write action exposed is "Sync
// Documentation", which regenerates the Database Tables/APIs sections
// straight from the real models/routes (see adminDeveloperController.js's
// syncDocumentation) -- narrative sections are authored directly via the
// API in a working session, never through this UI.

function RecentChanges({ moduleId }) {
  const [versions, setVersions] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open || versions !== null) return;
    adminApi.get(`/developer/modules/${moduleId}/versions`).then(({ data }) => setVersions(data.versions));
  }, [open, moduleId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ marginTop: 32, paddingTop: 20, borderTop: "1px solid var(--a-border)" }}>
      <button type="button" className="amx-btn amx-btn-outline" onClick={() => setOpen((v) => !v)}>
        <Icon name="clock" size={14} /> {open ? "Hide Recent Changes" : "Show Recent Changes"}
      </button>
      {open && (
        versions === null ? (
          <p className="amx-panel-sub" style={{ marginTop: 12 }}>Loading…</p>
        ) : versions.length === 0 ? (
          <p className="amx-panel-sub" style={{ marginTop: 12 }}>No recorded changes yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0" }}>
            {versions.map((v) => (
              <li key={v.id} style={{ padding: "10px 0", borderTop: "1px solid var(--a-border)" }}>
                <strong>Version {v.versionNumber}</strong>
                <span className="amx-panel-sub" style={{ marginLeft: 8 }}>{formatDate(v.createdAt)} &middot; {v.updatedByName || "Unknown"}</span>
                {v.changeSummary && <p style={{ margin: "4px 0 0", fontSize: 13 }}>{v.changeSummary}</p>}
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}

function ModuleArticle({ module, sections, navigate }) {
  // Lets authored content link to other modules with a plain
  // <a href="/admin/developer/other-key"> and still get a fast client-side
  // transition instead of a full page reload, without needing React Router
  // <Link> elements inside raw HTML.
  const onContentClick = (e) => {
    const a = e.target.closest("a");
    if (!a) return;
    const href = a.getAttribute("href") || "";
    if (href.startsWith("/admin/developer/")) {
      e.preventDefault();
      navigate(href);
    }
  };

  return (
    <article onClick={onContentClick}>
      <h1 style={{ marginBottom: 4 }}>{module.title}</h1>
      <p className="amx-panel-sub" style={{ marginBottom: 24 }}>{module.category || "Uncategorized"}</p>

      {sections.length > 1 && (
        <nav className="amx-card" style={{ padding: "16px 20px", marginBottom: 28, background: "var(--a-bg)" }}>
          <strong style={{ display: "block", marginBottom: 8, fontSize: 13 }}>Contents</strong>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13.5 }}>
            {sections.map((s) => (
              <li key={s.id} style={{ marginBottom: 4 }}>
                <a href={`#${s.key}`} onClick={(e) => { e.preventDefault(); document.getElementById(s.key)?.scrollIntoView({ behavior: "smooth" }); }}>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      {sections.map((s) => (
        <section key={s.id} id={s.key} style={{ marginBottom: 32, scrollMarginTop: 20 }}>
          <h2 style={{ borderBottom: "1px solid var(--a-border)", paddingBottom: 8, marginBottom: 14 }}>{s.title}</h2>
          {s.bodyHtml
            ? <div className="amx-wiki-body" dangerouslySetInnerHTML={{ __html: s.bodyHtml }} />
            : <p className="amx-panel-sub"><em>Not yet documented.</em></p>}
        </section>
      ))}

      <RecentChanges moduleId={module.id} />
    </article>
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
          onClick={() => onSelect(r.moduleId)}
          style={{ textAlign: "left", height: "auto", flexDirection: "column", alignItems: "flex-start", gap: 2, padding: "8px 12px" }}
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
  const [query, setQuery] = useState("");
  const [sections, setSections] = useState(null);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  useEffect(() => {
    setLoading(true);
    adminApi
      .get("/developer/modules")
      .then(({ data }) => setModules(data.modules))
      .catch((err) => setError(err.response?.data?.message || "Couldn't load modules."))
      .finally(() => setLoading(false));
  }, []);

  const activeModule = modules.find((m) => m.key === moduleKey);

  useEffect(() => {
    if (!activeModule) return;
    setSectionsLoading(true);
    adminApi
      .get(`/developer/modules/${activeModule.id}`)
      .then(({ data }) => setSections(data.sections))
      .finally(() => setSectionsLoading(false));
  }, [activeModule?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const runSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const { data } = await adminApi.post("/developer/sync");
      setSyncResult(data);
      if (activeModule && data.updated.includes(activeModule.title)) {
        const { data: fresh } = await adminApi.get(`/developer/modules/${activeModule.id}`);
        setSections(fresh.sections);
      }
    } catch (err) {
      setSyncResult({ error: err.response?.data?.message || "Sync failed." });
    } finally {
      setSyncing(false);
    }
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
      <div className="amx-empty">
        <Icon name="code" />
        <strong>No documentation yet</strong>
      </div>
    );
  }

  if (!moduleKey || !modules.some((m) => m.key === moduleKey)) {
    return <Navigate to={`/admin/developer/${modules[0].key}`} replace />;
  }

  return (
    <>
      <div className="amx-page-head">
        <div>
          <span className="amx-crumb">Administration</span>
          <h1>Developer</h1>
          <p>A read-only technical reference for the application &mdash; architecture, database, APIs, and business logic, module by module.</p>
        </div>
        <button className="amx-btn amx-btn-primary" onClick={runSync} disabled={syncing}>
          <Icon name="rotate" size={15} /> {syncing ? "Syncing…" : "Sync Documentation"}
        </button>
      </div>

      {syncResult && (
        <div className={syncResult.error ? "amx-form-error" : "amx-toast"} style={{ position: "static", marginBottom: 20 }}>
          {syncResult.error ? (
            <>{syncResult.error}</>
          ) : (
            <span>
              Documentation synchronized.{" "}
              {syncResult.updated.length > 0 ? `Updated: ${syncResult.updated.join(", ")}.` : "No structural changes detected."}
            </span>
          )}
        </div>
      )}

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
                {mods.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={m.key === moduleKey ? "active" : ""}
                    onClick={() => navigate(`/admin/developer/${m.key}`)}
                  >
                    {m.title}
                  </button>
                ))}
              </div>
            ))
          )}
        </nav>

        <div className="amx-card amx-panel">
          {sectionsLoading || !sections ? (
            <div className="amx-empty">
              <Icon name="fileText" />
              <strong>Loading…</strong>
            </div>
          ) : (
            <ModuleArticle module={activeModule} sections={sections} navigate={navigate} />
          )}
        </div>
      </div>
    </>
  );
}

export default Developer;
