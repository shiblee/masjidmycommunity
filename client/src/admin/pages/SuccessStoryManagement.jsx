import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import Icon from "../components/Icons.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import SortHeader from "../components/SortHeader.jsx";
import Pagination from "../components/Pagination.jsx";
import TranslateFieldsModal from "../components/TranslateFieldsModal.jsx";
import adminApi from "../services/adminApi.js";
import { API_ORIGIN } from "../../config.js";
import SuccessStoryCard from "../../components/SuccessStoryCard.jsx";

const PAGE_SIZE = 100;

function Toggle({ on, onClick, disabled }) {
  return <button type="button" className={`amx-toggle${on ? " on" : ""}`} onClick={onClick} disabled={disabled} aria-pressed={on} />;
}

function StoryFormModal({ story, onCancel, onSaved }) {
  const isEdit = !!story;
  const [title, setTitle] = useState(story?.title || "");
  const [summary, setSummary] = useState(story?.summary || "");
  const [body, setBody] = useState(story?.story || "");
  const [masjidName, setMasjidName] = useState(story?.masjidName || "");
  const [location, setLocation] = useState(story?.location || "");
  const [highlights, setHighlights] = useState(story?.highlights || "");
  const [isFeatured, setIsFeatured] = useState(story?.isFeatured || false);
  const [isActive, setIsActive] = useState(story ? story.isActive : true);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(story?.imageUrl ? `${API_ORIGIN}${story.imageUrl}` : null);
  const [removeImage, setRemoveImage] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const pickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setRemoveImage(false);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(true);
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !summary.trim() || !body.trim()) {
      setError("Title, summary, and the detailed story are all required.");
      return;
    }
    setSaving(true);
    setError("");
    const form = new FormData();
    form.append("title", title.trim());
    form.append("summary", summary.trim());
    form.append("story", body.trim());
    form.append("masjidName", masjidName.trim());
    form.append("location", location.trim());
    form.append("highlights", highlights.trim());
    form.append("isFeatured", isFeatured);
    form.append("isActive", isActive);
    if (imageFile) form.append("image", imageFile);
    if (isEdit && removeImage) form.append("removeImage", "true");

    try {
      const { data } = isEdit
        ? await adminApi.patch(`/success-stories/${story.id}`, form)
        : await adminApi.post("/success-stories", form);
      onSaved(data.story, isEdit);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save this success story.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <h3>{isEdit ? "Edit Success Story" : "Add Success Story"}</h3>
        <form onSubmit={submit} style={{ marginTop: 16 }}>
          <div className="amx-form-group">
            <label htmlFor="ss-image">Story Image</label>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 72, height: 52, borderRadius: 8, overflow: "hidden", background: "var(--a-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid var(--a-border)" }}>
                {imagePreview ? <img src={imagePreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Icon name="imageIcon" size={18} />}
              </span>
              <input ref={fileRef} id="ss-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={pickImage} style={{ flex: 1 }} />
              {imagePreview && (
                <button type="button" className="amx-btn amx-btn-outline amx-btn-sm" onClick={clearImage}>Remove</button>
              )}
            </div>
          </div>
          <div className="amx-form-group">
            <label htmlFor="ss-title">Title</label>
            <input id="ss-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. A well that changed daily life in rural Senegal" autoFocus />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="amx-form-group">
              <label htmlFor="ss-masjid">Masjid / Community</label>
              <input id="ss-masjid" type="text" value={masjidName} onChange={(e) => setMasjidName(e.target.value)} placeholder="e.g. Masjid Al-Ihsan" />
            </div>
            <div className="amx-form-group">
              <label htmlFor="ss-location">Location</label>
              <input id="ss-location" type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Dakar, Senegal" />
            </div>
          </div>
          <div className="amx-form-group">
            <label htmlFor="ss-summary">Summary (English)</label>
            <textarea id="ss-summary" rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="A short one or two sentence summary shown on the card…" />
          </div>
          <div className="amx-form-group">
            <label htmlFor="ss-story">Detailed Story (English)</label>
            <textarea id="ss-story" rows={6} value={body} onChange={(e) => setBody(e.target.value)} placeholder="The full story, shown on the story's own page…" />
          </div>
          <div className="amx-form-group">
            <label htmlFor="ss-highlights">Key Highlights <span className="amx-panel-sub" style={{ display: "inline" }}>(one per line)</span></label>
            <textarea id="ss-highlights" rows={3} value={highlights} onChange={(e) => setHighlights(e.target.value)} placeholder={"640 donors across 22 countries\n1,200 people served\nCompleted in 10 weeks"} />
          </div>
          {error && (
            <div className="amx-field-error">
              <Icon name="info" size={14} />
              {error}
            </div>
          )}
          <div className="amx-form-group" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <label style={{ marginBottom: 0 }}>Featured</label>
            <Toggle on={isFeatured} onClick={() => setIsFeatured((f) => !f)} disabled={saving} />
          </div>
          <div className="amx-form-group" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <label style={{ marginBottom: 0 }}>Status</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="amx-panel-sub">{isActive ? "Active" : "Inactive"}</span>
              <Toggle on={isActive} onClick={() => setIsActive((a) => !a)} disabled={saving} />
            </div>
          </div>
          <button type="submit" className="amx-btn amx-btn-primary" style={{ width: "100%", marginTop: 12 }} disabled={saving || !title.trim() || !summary.trim() || !body.trim()}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Success Story"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ story, onCancel, onConfirm, busy }) {
  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <div className="amx-modal-danger-icon"><Icon name="trash" size={22} /></div>
        <h3 style={{ textAlign: "center" }}>Delete this success story?</h3>
        <p className="amx-modal-sub" style={{ textAlign: "center" }}>"{story.title}" will be permanently removed. This can't be undone.</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="amx-btn amx-btn-outline" style={{ flex: 1 }} onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="amx-btn amx-btn-danger" style={{ flex: 1 }} onClick={onConfirm} disabled={busy}>{busy ? "Please wait…" : "Delete"}</button>
        </div>
      </div>
    </div>
  );
}

function PreviewModal({ story, onCancel }) {
  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <p className="amx-modal-sub" style={{ marginBottom: 16 }}>This is exactly how the card will appear on the public Success Stories page.</p>
        <SuccessStoryCard story={story} featured={story.isFeatured} interactive={false} />
      </div>
    </div>
  );
}

const SORT_COLUMNS = {
  title: { label: "Title", get: (s) => s.title?.toLowerCase() || "" },
  status: { label: "Status", get: (s) => (s.isActive ? 1 : 0) },
  featured: { label: "Featured", get: (s) => (s.isFeatured ? 1 : 0) },
  sortOrder: { label: "Order", get: (s) => s.sortOrder || 0 },
};

const SuccessStoriesPanel = forwardRef(function SuccessStoriesPanel(props, ref) {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [featuredFilter, setFeaturedFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState("sortOrder");
  const [sortDir, setSortDir] = useState("asc");
  const [toast, setToast] = useState(null);
  const [formModal, setFormModal] = useState(null);
  useImperativeHandle(ref, () => ({ openAdd: () => setFormModal("new") }), []);
  const [deleting, setDeleting] = useState(null);
  const [previewing, setPreviewing] = useState(null);
  const [translating, setTranslating] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  useEffect(() => {
    adminApi
      .get("/success-stories")
      .then(({ data }) => setStories(data.stories))
      .catch((err) => setError(err.response?.data?.message || "Couldn't load success stories."))
      .finally(() => setLoading(false));
  }, []);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stories.filter((s) => {
      const matchesQuery = !q || s.title.toLowerCase().includes(q) || s.summary.toLowerCase().includes(q) || (s.masjidName || "").toLowerCase().includes(q);
      const matchesStatus = status === "all" || (status === "active" ? s.isActive : !s.isActive);
      const matchesFeatured = featuredFilter === "all" || (featuredFilter === "featured" ? s.isFeatured : !s.isFeatured);
      return matchesQuery && matchesStatus && matchesFeatured;
    });
  }, [stories, query, status, featuredFilter]);

  const sorted = useMemo(() => {
    const getValue = SORT_COLUMNS[sortKey].get;
    return [...filtered].sort((a, b) => {
      const av = getValue(a);
      const bv = getValue(b);
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  useEffect(() => setPage(1), [query, status, featuredFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const upsertStory = (story, isEdit) => {
    setStories((ss) => (isEdit ? ss.map((s) => (s.id === story.id ? story : s)) : [...ss, story]));
    setFormModal(null);
    showToast(isEdit ? "Success story updated." : "Success story added.");
  };

  const toggleActive = async (s) => {
    setBusyId(s.id);
    const prev = s.isActive;
    setStories((ss) => ss.map((x) => (x.id === s.id ? { ...x, isActive: !prev } : x)));
    try {
      await adminApi.patch(`/success-stories/${s.id}`, { isActive: !prev });
      showToast(!prev ? "Success story activated." : "Success story deactivated.");
    } catch (err) {
      setStories((ss) => ss.map((x) => (x.id === s.id ? { ...x, isActive: prev } : x)));
      showToast(err.response?.data?.message || "Couldn't update this success story.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    const s = deleting;
    setBusyId(s.id);
    try {
      await adminApi.delete(`/success-stories/${s.id}`);
      setStories((ss) => ss.filter((x) => x.id !== s.id));
      showToast("Success story deleted.");
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't delete this success story.");
    } finally {
      setBusyId(null);
      setDeleting(null);
    }
  };

  return (
    <>
      <div className="amx-card amx-panel">
        <div className="amx-filters">
          <div className="amx-search">
            <Icon name="search" />
            <input type="text" placeholder="Search by title, summary, or masjid…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <select className="amx-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select className="amx-select" value={featuredFilter} onChange={(e) => setFeaturedFilter(e.target.value)}>
            <option value="all">Featured &amp; not featured</option>
            <option value="featured">Featured only</option>
            <option value="not">Not featured</option>
          </select>
        </div>

        {error && (
          <div className="amx-form-error" style={{ margin: "0 0 16px" }}>
            <Icon name="info" size={17} />
            {error}
          </div>
        )}

        {loading ? (
          <div className="amx-empty">
            <Icon name="book" />
            <strong>Loading success stories…</strong>
          </div>
        ) : filtered.length === 0 ? (
          <div className="amx-empty">
            <Icon name="book" />
            <strong>No success stories match your filters</strong>
            <span>Try a different search term or filter.</span>
          </div>
        ) : (
          <div className="amx-table-wrap">
            <table className="amx-table">
              <thead>
                <tr>
                  <SortHeader label="Title" sortKey="title" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <th>Masjid / Location</th>
                  <SortHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <SortHeader label="Featured" sortKey="featured" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <SortHeader label="Order" sortKey="sortOrder" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paged.map((s) => (
                  <tr key={s.id}>
                    <td style={{ maxWidth: 280 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ width: 44, height: 32, borderRadius: 6, overflow: "hidden", background: "var(--a-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {s.imageUrl ? <img src={`${API_ORIGIN}${s.imageUrl}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Icon name="imageIcon" size={14} />}
                        </span>
                        <strong>{s.title}</strong>
                      </div>
                    </td>
                    <td style={{ fontSize: 12.5 }}>{[s.masjidName, s.location].filter(Boolean).join(" — ") || "—"}</td>
                    <td><StatusBadge status={s.isActive ? "active" : "inactive"} /></td>
                    <td>{s.isFeatured ? <Icon name="star" size={15} /> : "—"}</td>
                    <td>{s.sortOrder}</td>
                    <td>
                      <div className="amx-row-actions">
                        <button className="amx-icon-action" aria-label="Preview" title="Preview" onClick={() => setPreviewing(s)}>
                          <Icon name="eye" />
                        </button>
                        <button className="amx-icon-action" aria-label="Edit" title="Edit" onClick={() => setFormModal(s)}>
                          <Icon name="edit" />
                        </button>
                        <button className="amx-icon-action" aria-label="Translate summary" title="Translate summary" onClick={() => setTranslating({ story: s, field: "summary" })}>
                          S<Icon name="globe" size={12} />
                        </button>
                        <button className="amx-icon-action" aria-label="Translate story" title="Translate story" onClick={() => setTranslating({ story: s, field: "story" })}>
                          T<Icon name="globe" size={12} />
                        </button>
                        {s.isActive ? (
                          <button className="amx-btn amx-btn-outline amx-btn-sm" disabled={busyId === s.id} onClick={() => toggleActive(s)}>Deactivate</button>
                        ) : (
                          <button className="amx-btn amx-btn-accent amx-btn-sm" disabled={busyId === s.id} onClick={() => toggleActive(s)}>Activate</button>
                        )}
                        <button className="amx-icon-action" aria-label="Delete" title="Delete" disabled={busyId === s.id} onClick={() => setDeleting(s)}>
                          <Icon name="trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} totalItems={sorted.length} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      {formModal && (
        <StoryFormModal
          story={formModal === "new" ? null : formModal}
          onCancel={() => setFormModal(null)}
          onSaved={upsertStory}
        />
      )}

      {deleting && (
        <ConfirmDeleteModal story={deleting} busy={busyId === deleting.id} onCancel={() => setDeleting(null)} onConfirm={confirmDelete} />
      )}

      {previewing && <PreviewModal story={previewing} onCancel={() => setPreviewing(null)} />}

      {translating && (
        <TranslateFieldsModal
          title={`Translate ${translating.field === "summary" ? "Summary" : "Story"}`}
          category="successStory"
          entityKey={`successStory.${translating.field}.${translating.story.id}`}
          defaultLabel={translating.story[translating.field] || ""}
          onCancel={() => setTranslating(null)}
          onSaved={() => {
            setTranslating(null);
            showToast("Translations saved.");
          }}
        />
      )}

      {toast && <div className="amx-toast"><Icon name="check" />{toast}</div>}
    </>
  );
});

export default SuccessStoriesPanel;
