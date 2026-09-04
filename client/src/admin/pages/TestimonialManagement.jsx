import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import Icon from "../components/Icons.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import SortHeader from "../components/SortHeader.jsx";
import Pagination from "../components/Pagination.jsx";
import TranslateFieldsModal from "../components/TranslateFieldsModal.jsx";
import adminApi from "../services/adminApi.js";
import { API_ORIGIN } from "../../config.js";
import { formatDate } from "../../utils/formatDateTime.js";
import TestimonialCard from "../../components/TestimonialCard.jsx";

const PAGE_SIZE = 100;

function Toggle({ on, onClick, disabled }) {
  return <button type="button" className={`amx-toggle${on ? " on" : ""}`} onClick={onClick} disabled={disabled} aria-pressed={on} />;
}

// A clickable 1-5 star picker — separate from the read-only <StarRating>
// used on the public card, since this one needs hover/click state.
function StarPicker({ value, onChange, disabled }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value || 0;
  return (
    <div className="amx-star-picker">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(value === n ? null : n)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
        >
          <svg viewBox="0 0 24 24" width={20} height={20} fill={n <= shown ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
            <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" />
          </svg>
        </button>
      ))}
      {value ? <span className="amx-star-picker-clear" onClick={() => !disabled && onChange(null)}>Clear</span> : null}
    </div>
  );
}

function TestimonialFormModal({ testimonial, onCancel, onSaved }) {
  const isEdit = !!testimonial;
  const [authorName, setAuthorName] = useState(testimonial?.authorName || "");
  const [designation, setDesignation] = useState(testimonial?.designation || "");
  const [quote, setQuote] = useState(testimonial?.quote || "");
  const [rating, setRating] = useState(testimonial?.rating || null);
  const [testimonialDate, setTestimonialDate] = useState(testimonial?.testimonialDate || "");
  const [isFeatured, setIsFeatured] = useState(testimonial?.isFeatured || false);
  const [isActive, setIsActive] = useState(testimonial ? testimonial.isActive : true);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(testimonial?.photoUrl ? `${API_ORIGIN}${testimonial.photoUrl}` : null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const pickPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setRemovePhoto(false);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setRemovePhoto(true);
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!authorName.trim() || !quote.trim()) {
      setError("Author name and testimonial content are both required.");
      return;
    }
    setSaving(true);
    setError("");
    const form = new FormData();
    form.append("authorName", authorName.trim());
    form.append("designation", designation.trim());
    form.append("quote", quote.trim());
    form.append("rating", rating || "");
    form.append("testimonialDate", testimonialDate || "");
    form.append("isFeatured", isFeatured);
    form.append("isActive", isActive);
    if (photoFile) form.append("photo", photoFile);
    if (isEdit && removePhoto) form.append("removePhoto", "true");

    try {
      const { data } = isEdit
        ? await adminApi.patch(`/testimonials/${testimonial.id}`, form)
        : await adminApi.post("/testimonials", form);
      onSaved(data.testimonial, isEdit);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save this testimonial.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <h3>{isEdit ? "Edit Testimonial" : "Add Testimonial"}</h3>
        <form onSubmit={submit} style={{ marginTop: 16 }}>
          <div className="amx-form-group">
            <label htmlFor="t-photo">Profile Photo</label>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 52, height: 52, borderRadius: "50%", overflow: "hidden", background: "var(--a-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid var(--a-border)" }}>
                {photoPreview ? <img src={photoPreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Icon name="users" size={20} />}
              </span>
              <input ref={fileRef} id="t-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={pickPhoto} style={{ flex: 1 }} />
              {photoPreview && (
                <button type="button" className="amx-btn amx-btn-outline amx-btn-sm" onClick={clearPhoto}>Remove</button>
              )}
            </div>
          </div>
          <div className="amx-form-group">
            <label htmlFor="t-name">Name</label>
            <input id="t-name" type="text" value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="e.g. Imam Yusuf Rahman" autoFocus />
          </div>
          <div className="amx-form-group">
            <label htmlFor="t-designation">Designation / Location</label>
            <input id="t-designation" type="text" value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. Masjid Committee Chair, Nairobi" />
          </div>
          <div className="amx-form-group">
            <label htmlFor="t-quote">Testimonial (English)</label>
            <textarea id="t-quote" rows={4} value={quote} onChange={(e) => setQuote(e.target.value)} placeholder="What they said…" />
          </div>
          <div className="amx-form-group">
            <label>Rating</label>
            <StarPicker value={rating} onChange={setRating} disabled={saving} />
          </div>
          <div className="amx-form-group">
            <label htmlFor="t-date">Testimonial Date</label>
            <input id="t-date" type="date" className="amx-select" style={{ width: "100%" }} value={testimonialDate || ""} onChange={(e) => setTestimonialDate(e.target.value)} />
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
          <button type="submit" className="amx-btn amx-btn-primary" style={{ width: "100%", marginTop: 12 }} disabled={saving || !authorName.trim() || !quote.trim()}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Testimonial"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ testimonial, onCancel, onConfirm, busy }) {
  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <div className="amx-modal-danger-icon"><Icon name="trash" size={22} /></div>
        <h3 style={{ textAlign: "center" }}>Delete this testimonial?</h3>
        <p className="amx-modal-sub" style={{ textAlign: "center" }}>The testimonial from "{testimonial.authorName}" will be permanently removed. This can't be undone.</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="amx-btn amx-btn-outline" style={{ flex: 1 }} onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="amx-btn amx-btn-danger" style={{ flex: 1 }} onClick={onConfirm} disabled={busy}>{busy ? "Please wait…" : "Delete"}</button>
        </div>
      </div>
    </div>
  );
}

function PreviewModal({ testimonial, onCancel }) {
  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460, background: "var(--ink, #0b1f1e)" }}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <p className="amx-modal-sub" style={{ marginBottom: 16 }}>This is exactly how the card will appear on the public Testimonials page.</p>
        <TestimonialCard testimonial={testimonial} featured={testimonial.isFeatured} />
      </div>
    </div>
  );
}

const SORT_COLUMNS = {
  authorName: { label: "Name", get: (t) => t.authorName?.toLowerCase() || "" },
  status: { label: "Status", get: (t) => (t.isActive ? 1 : 0) },
  featured: { label: "Featured", get: (t) => (t.isFeatured ? 1 : 0) },
  rating: { label: "Rating", get: (t) => t.rating || 0 },
  sortOrder: { label: "Order", get: (t) => t.sortOrder || 0 },
};

const TestimonialsPanel = forwardRef(function TestimonialsPanel(props, ref) {
  const [testimonials, setTestimonials] = useState([]);
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
      .get("/testimonials")
      .then(({ data }) => setTestimonials(data.testimonials))
      .catch((err) => setError(err.response?.data?.message || "Couldn't load testimonials."))
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
    return testimonials.filter((t) => {
      const matchesQuery = !q || t.authorName.toLowerCase().includes(q) || t.quote.toLowerCase().includes(q) || (t.designation || "").toLowerCase().includes(q);
      const matchesStatus = status === "all" || (status === "active" ? t.isActive : !t.isActive);
      const matchesFeatured = featuredFilter === "all" || (featuredFilter === "featured" ? t.isFeatured : !t.isFeatured);
      return matchesQuery && matchesStatus && matchesFeatured;
    });
  }, [testimonials, query, status, featuredFilter]);

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

  const upsertTestimonial = (testimonial, isEdit) => {
    setTestimonials((ts) => (isEdit ? ts.map((t) => (t.id === testimonial.id ? testimonial : t)) : [...ts, testimonial]));
    setFormModal(null);
    showToast(isEdit ? "Testimonial updated." : "Testimonial added.");
  };

  const toggleActive = async (t) => {
    setBusyId(t.id);
    const prev = t.isActive;
    setTestimonials((ts) => ts.map((x) => (x.id === t.id ? { ...x, isActive: !prev } : x)));
    try {
      await adminApi.patch(`/testimonials/${t.id}`, { isActive: !prev });
      showToast(!prev ? "Testimonial activated." : "Testimonial deactivated.");
    } catch (err) {
      setTestimonials((ts) => ts.map((x) => (x.id === t.id ? { ...x, isActive: prev } : x)));
      showToast(err.response?.data?.message || "Couldn't update this testimonial.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    const t = deleting;
    setBusyId(t.id);
    try {
      await adminApi.delete(`/testimonials/${t.id}`);
      setTestimonials((ts) => ts.filter((x) => x.id !== t.id));
      showToast("Testimonial deleted.");
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't delete this testimonial.");
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
            <input type="text" placeholder="Search by name, designation, or content…" value={query} onChange={(e) => setQuery(e.target.value)} />
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
            <Icon name="quote" />
            <strong>Loading testimonials…</strong>
          </div>
        ) : filtered.length === 0 ? (
          <div className="amx-empty">
            <Icon name="quote" />
            <strong>No testimonials match your filters</strong>
            <span>Try a different search term or filter.</span>
          </div>
        ) : (
          <div className="amx-table-wrap">
            <table className="amx-table">
              <thead>
                <tr>
                  <SortHeader label="Name" sortKey="authorName" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <th>Testimonial</th>
                  <SortHeader label="Rating" sortKey="rating" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <SortHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <SortHeader label="Featured" sortKey="featured" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <SortHeader label="Order" sortKey="sortOrder" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paged.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", background: "var(--a-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 11, fontWeight: 700, color: "var(--a-text-dim)" }}>
                          {t.photoUrl ? <img src={`${API_ORIGIN}${t.photoUrl}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : t.authorName?.[0]}
                        </span>
                        <div>
                          <strong style={{ display: "block" }}>{t.authorName}</strong>
                          {t.designation && <span className="amx-panel-sub" style={{ fontSize: 12 }}>{t.designation}</span>}
                        </div>
                      </div>
                    </td>
                    <td style={{ maxWidth: 320 }}>
                      <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", fontSize: 13 }}>{t.quote}</span>
                      {t.testimonialDate && <span className="amx-panel-sub" style={{ fontSize: 11.5 }}>{formatDate(t.testimonialDate)}</span>}
                    </td>
                    <td>{t.rating ? `${t.rating} / 5` : "—"}</td>
                    <td><StatusBadge status={t.isActive ? "active" : "inactive"} /></td>
                    <td>{t.isFeatured ? <Icon name="star" size={15} /> : "—"}</td>
                    <td>{t.sortOrder}</td>
                    <td>
                      <div className="amx-row-actions">
                        <button className="amx-icon-action" aria-label="Preview" title="Preview" onClick={() => setPreviewing(t)}>
                          <Icon name="eye" />
                        </button>
                        <button className="amx-icon-action" aria-label="Edit" title="Edit" onClick={() => setFormModal(t)}>
                          <Icon name="edit" />
                        </button>
                        <button className="amx-icon-action" aria-label="Translate testimonial" title="Translate testimonial" onClick={() => setTranslating({ testimonial: t, field: "quote" })}>
                          Q<Icon name="globe" size={12} />
                        </button>
                        <button className="amx-icon-action" aria-label="Translate designation" title="Translate designation" onClick={() => setTranslating({ testimonial: t, field: "designation" })}>
                          D<Icon name="globe" size={12} />
                        </button>
                        {t.isActive ? (
                          <button className="amx-btn amx-btn-outline amx-btn-sm" disabled={busyId === t.id} onClick={() => toggleActive(t)}>Deactivate</button>
                        ) : (
                          <button className="amx-btn amx-btn-accent amx-btn-sm" disabled={busyId === t.id} onClick={() => toggleActive(t)}>Activate</button>
                        )}
                        <button className="amx-icon-action" aria-label="Delete" title="Delete" disabled={busyId === t.id} onClick={() => setDeleting(t)}>
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
        <TestimonialFormModal
          testimonial={formModal === "new" ? null : formModal}
          onCancel={() => setFormModal(null)}
          onSaved={upsertTestimonial}
        />
      )}

      {deleting && (
        <ConfirmDeleteModal testimonial={deleting} busy={busyId === deleting.id} onCancel={() => setDeleting(null)} onConfirm={confirmDelete} />
      )}

      {previewing && <PreviewModal testimonial={previewing} onCancel={() => setPreviewing(null)} />}

      {translating && (
        <TranslateFieldsModal
          title={`Translate ${translating.field === "quote" ? "Testimonial" : "Designation"}`}
          category="testimonial"
          entityKey={`testimonial.${translating.field}.${translating.testimonial.id}`}
          defaultLabel={translating.testimonial[translating.field] || ""}
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

export default TestimonialsPanel;
