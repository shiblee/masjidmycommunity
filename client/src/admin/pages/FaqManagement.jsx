import React, { useEffect, useMemo, useState } from "react";
import Icon from "../components/Icons.jsx";
import { Icon as PublicIcon } from "../../components/Icons.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import SortHeader from "../components/SortHeader.jsx";
import Pagination from "../components/Pagination.jsx";
import TranslateFieldsModal from "../components/TranslateFieldsModal.jsx";
import adminApi from "../services/adminApi.js";
import { formatDate } from "../../utils/formatDateTime.js";

const PAGE_SIZE = 100;

const ICON_OPTIONS = [
  "compass", "mosque", "shieldCheck", "flag", "globe", "heart", "chartUp", "people", "book", "sun",
  "drop", "monitor", "bulb", "link", "camera", "upload", "trash", "edit", "check", "star",
  "chevronLeft", "chevronRight", "mapPin", "phone", "mail", "building", "wallet", "search", "x", "plus",
  "imageIcon", "play",
];

function Toggle({ on, onClick, disabled }) {
  return <button type="button" className={`amx-toggle${on ? " on" : ""}`} onClick={onClick} disabled={disabled} aria-pressed={on} />;
}

function FaqFormModal({ faq, categories, onCancel, onSaved }) {
  const isEdit = !!faq;
  const [category, setCategory] = useState(faq?.category || categories[0] || "");
  const [question, setQuestion] = useState(faq?.question || "");
  const [answer, setAnswer] = useState(faq?.answer || "");
  const [icon, setIcon] = useState(faq?.icon || "compass");
  const [isFeatured, setIsFeatured] = useState(faq?.isFeatured || false);
  const [isActive, setIsActive] = useState(faq ? faq.isActive : true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) {
      setError("Question and answer are both required.");
      return;
    }
    setSaving(true);
    setError("");
    const payload = { category, question: question.trim(), answer: answer.trim(), icon, isFeatured, isActive };
    try {
      const { data } = isEdit
        ? await adminApi.patch(`/faqs/${faq.id}`, payload)
        : await adminApi.post("/faqs", payload);
      onSaved(data.faq, isEdit);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save this FAQ.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <h3>{isEdit ? "Edit FAQ" : "Add FAQ"}</h3>
        <form onSubmit={submit} style={{ marginTop: 16 }}>
          <div className="amx-form-group">
            <label htmlFor="faq-category">Category</label>
            <select id="faq-category" className="amx-select" style={{ width: "100%" }} value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="amx-form-group">
            <label htmlFor="faq-question">Question (English)</label>
            <input id="faq-question" type="text" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g. How do I register my masjid?" autoFocus />
          </div>
          <div className="amx-form-group">
            <label htmlFor="faq-answer">Answer (English)</label>
            <textarea id="faq-answer" rows={4} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="A clear, direct answer…" />
          </div>
          <div className="amx-form-group">
            <label htmlFor="faq-icon">Icon</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 36, height: 36, borderRadius: 8, background: "var(--a-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <PublicIcon name={icon} size={18} />
              </span>
              <select id="faq-icon" className="amx-select" style={{ flex: 1 }} value={icon} onChange={(e) => setIcon(e.target.value)}>
                {ICON_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
          </div>
          {error && (
            <div className="amx-field-error">
              <Icon name="info" size={14} />
              {error}
            </div>
          )}
          <div className="amx-form-group" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <label style={{ marginBottom: 0 }}>Featured / Popular</label>
            <Toggle on={isFeatured} onClick={() => setIsFeatured((f) => !f)} disabled={saving} />
          </div>
          <div className="amx-form-group" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <label style={{ marginBottom: 0 }}>Status</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="amx-panel-sub">{isActive ? "Active" : "Inactive"}</span>
              <Toggle on={isActive} onClick={() => setIsActive((a) => !a)} disabled={saving} />
            </div>
          </div>
          <button type="submit" className="amx-btn amx-btn-primary" style={{ width: "100%", marginTop: 12 }} disabled={saving || !question.trim() || !answer.trim()}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add FAQ"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ faq, onCancel, onConfirm, busy }) {
  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <div className="amx-modal-danger-icon"><Icon name="trash" size={22} /></div>
        <h3 style={{ textAlign: "center" }}>Delete this FAQ?</h3>
        <p className="amx-modal-sub" style={{ textAlign: "center" }}>"{faq.question}" will be permanently removed. This can't be undone.</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="amx-btn amx-btn-outline" style={{ flex: 1 }} onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="amx-btn amx-btn-danger" style={{ flex: 1 }} onClick={onConfirm} disabled={busy}>{busy ? "Please wait…" : "Delete"}</button>
        </div>
      </div>
    </div>
  );
}

const SORT_COLUMNS = {
  question: { label: "Question", get: (f) => f.question?.toLowerCase() || "" },
  category: { label: "Category", get: (f) => f.category || "" },
  status: { label: "Status", get: (f) => (f.isActive ? 1 : 0) },
  featured: { label: "Featured", get: (f) => (f.isFeatured ? 1 : 0) },
  sortOrder: { label: "Order", get: (f) => f.sortOrder || 0 },
};

function FaqListPanel() {
  const [faqs, setFaqs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState("sortOrder");
  const [sortDir, setSortDir] = useState("asc");
  const [toast, setToast] = useState(null);
  const [formModal, setFormModal] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [translating, setTranslating] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  useEffect(() => {
    Promise.all([adminApi.get("/faqs"), adminApi.get("/faqs/categories")])
      .then(([faqsRes, catRes]) => {
        setFaqs(faqsRes.data.faqs);
        setCategories(catRes.data.categories);
      })
      .catch((err) => setError(err.response?.data?.message || "Couldn't load FAQs."))
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
    return faqs.filter((f) => {
      const matchesQuery = !q || f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q);
      const matchesCategory = category === "all" || f.category === category;
      const matchesStatus = status === "all" || (status === "active" ? f.isActive : !f.isActive);
      return matchesQuery && matchesCategory && matchesStatus;
    });
  }, [faqs, query, category, status]);

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

  useEffect(() => setPage(1), [query, category, status, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const upsertFaq = (faq, isEdit) => {
    setFaqs((fs) => (isEdit ? fs.map((f) => (f.id === faq.id ? faq : f)) : [...fs, faq]));
    setFormModal(null);
    showToast(isEdit ? "FAQ updated." : "FAQ added.");
  };

  const toggleActive = async (faq) => {
    setBusyId(faq.id);
    const prev = faq.isActive;
    setFaqs((fs) => fs.map((f) => (f.id === faq.id ? { ...f, isActive: !prev } : f)));
    try {
      await adminApi.patch(`/faqs/${faq.id}`, { isActive: !prev });
      showToast(!prev ? "FAQ activated." : "FAQ deactivated.");
    } catch (err) {
      setFaqs((fs) => fs.map((f) => (f.id === faq.id ? { ...f, isActive: prev } : f)));
      showToast(err.response?.data?.message || "Couldn't update this FAQ.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    const faq = deleting;
    setBusyId(faq.id);
    try {
      await adminApi.delete(`/faqs/${faq.id}`);
      setFaqs((fs) => fs.filter((f) => f.id !== faq.id));
      showToast("FAQ deleted.");
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't delete this FAQ.");
    } finally {
      setBusyId(null);
      setDeleting(null);
    }
  };

  return (
    <>
      <div className="amx-panel-head">
        <div>
          <h3>FAQs</h3>
          <div className="amx-panel-sub">Manage the questions and answers shown on the public FAQ page and used to ground the AI assistant</div>
        </div>
        <button className="amx-btn amx-btn-primary" onClick={() => setFormModal("new")}>
          <Icon name="plus" size={15} /> Add FAQ
        </button>
      </div>

      <div className="amx-filters">
        <div className="amx-search">
          <Icon name="search" />
          <input type="text" placeholder="Search by question or answer…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className="amx-select" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="amx-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
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
          <Icon name="bulb" />
          <strong>Loading FAQs…</strong>
        </div>
      ) : filtered.length === 0 ? (
        <div className="amx-empty">
          <Icon name="bulb" />
          <strong>No FAQs match your filters</strong>
          <span>Try a different search term, category, or status.</span>
        </div>
      ) : (
        <div className="amx-table-wrap">
          <table className="amx-table">
            <thead>
              <tr>
                <SortHeader label="Question" sortKey="question" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Category" sortKey="category" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Featured" sortKey="featured" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paged.map((f) => (
                <tr key={f.id}>
                  <td style={{ maxWidth: 360 }}><strong>{f.question}</strong></td>
                  <td>{f.category}</td>
                  <td><StatusBadge status={f.isActive ? "active" : "inactive"} /></td>
                  <td>{f.isFeatured ? <Icon name="star" size={15} /> : "—"}</td>
                  <td>
                    <div className="amx-row-actions">
                      <button className="amx-icon-action" aria-label="Edit" title="Edit" onClick={() => setFormModal(f)}>
                        <Icon name="edit" />
                      </button>
                      <button className="amx-icon-action" aria-label="Translate question" title="Translate question" onClick={() => setTranslating({ faq: f, field: "question" })}>
                        Q<Icon name="globe" size={12} />
                      </button>
                      <button className="amx-icon-action" aria-label="Translate answer" title="Translate answer" onClick={() => setTranslating({ faq: f, field: "answer" })}>
                        A<Icon name="globe" size={12} />
                      </button>
                      {f.isActive ? (
                        <button className="amx-btn amx-btn-outline amx-btn-sm" disabled={busyId === f.id} onClick={() => toggleActive(f)}>Deactivate</button>
                      ) : (
                        <button className="amx-btn amx-btn-accent amx-btn-sm" disabled={busyId === f.id} onClick={() => toggleActive(f)}>Activate</button>
                      )}
                      <button className="amx-icon-action" aria-label="Delete" title="Delete" disabled={busyId === f.id} onClick={() => setDeleting(f)}>
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

      {formModal && (
        <FaqFormModal
          faq={formModal === "new" ? null : formModal}
          categories={categories}
          onCancel={() => setFormModal(null)}
          onSaved={upsertFaq}
        />
      )}

      {deleting && (
        <ConfirmDeleteModal faq={deleting} busy={busyId === deleting.id} onCancel={() => setDeleting(null)} onConfirm={confirmDelete} />
      )}

      {translating && (
        <TranslateFieldsModal
          title={`Translate ${translating.field === "question" ? "Question" : "Answer"}`}
          category="faq"
          entityKey={`faq.${translating.field}.${translating.faq.id}`}
          defaultLabel={translating.faq[translating.field]}
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
}

function AiQueryLogPanel() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [aiCalled, setAiCalled] = useState("all");
  const [feedback, setFeedback] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError("");
    const params = { page };
    if (aiCalled !== "all") params.aiCalled = aiCalled;
    if (feedback !== "all") params.feedback = feedback;
    adminApi
      .get("/ai-query-logs", { params })
      .then(({ data }) => {
        setLogs(data.logs);
        setTotalPages(data.totalPages);
        setTotalItems(data.totalItems);
      })
      .catch((err) => setError(err.response?.data?.message || "Couldn't load the query log."))
      .finally(() => setLoading(false));
  }, [aiCalled, feedback, page]);

  useEffect(() => setPage(1), [aiCalled, feedback]);

  return (
    <>
      <div className="amx-panel-head">
        <div>
          <h3>AI Query Log</h3>
          <div className="amx-panel-sub">What visitors are asking the AI assistant — use this to spot content gaps to cover with a new FAQ</div>
        </div>
      </div>

      <div className="amx-filters">
        <select className="amx-select" value={aiCalled} onChange={(e) => setAiCalled(e.target.value)}>
          <option value="all">All questions</option>
          <option value="true">AI answered</option>
          <option value="false">Not enough information</option>
        </select>
        <select className="amx-select" value={feedback} onChange={(e) => setFeedback(e.target.value)}>
          <option value="all">Any feedback</option>
          <option value="helpful">Marked helpful</option>
          <option value="unhelpful">Marked unhelpful</option>
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
          <Icon name="bulb" />
          <strong>Loading…</strong>
        </div>
      ) : logs.length === 0 ? (
        <div className="amx-empty">
          <Icon name="bulb" />
          <strong>No questions match your filters</strong>
        </div>
      ) : (
        <div className="amx-table-wrap">
          <table className="amx-table">
            <thead>
              <tr>
                <th>Question</th>
                <th>Language</th>
                <th>Result</th>
                <th>Sources</th>
                <th>Feedback</th>
                <th>Asked</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td style={{ maxWidth: 320 }}>{l.question}</td>
                  <td>{l.languageCode}</td>
                  <td>{l.aiCalled ? <StatusBadge status="active" label="Answered" /> : <StatusBadge status="inactive" label="Not answered" />}</td>
                  <td style={{ maxWidth: 220, fontSize: 12 }}>{l.matchedCategories || "—"}</td>
                  <td>
                    {l.feedback === "helpful" && <StatusBadge status="active" label="Helpful" />}
                    {l.feedback === "unhelpful" && <StatusBadge status="rejected" label="Unhelpful" />}
                    {!l.feedback && "—"}
                  </td>
                  <td>{formatDate(l.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={50} onChange={setPage} />
    </>
  );
}

function FaqManagement() {
  const [tab, setTab] = useState("faqs");

  return (
    <>
      <div className="amx-page-head">
        <div>
          <span className="amx-crumb">Administration</span>
          <h1>FAQ &amp; AI Assistant</h1>
          <p>Manage FAQ content and review what the AI assistant is being asked</p>
        </div>
      </div>

      <div className="amx-tabs" style={{ marginBottom: 20 }}>
        <button className={tab === "faqs" ? "active" : ""} onClick={() => setTab("faqs")}>FAQs</button>
        <button className={tab === "log" ? "active" : ""} onClick={() => setTab("log")}>AI Query Log</button>
      </div>

      <div className="amx-card amx-panel">
        {tab === "faqs" ? <FaqListPanel /> : <AiQueryLogPanel />}
      </div>
    </>
  );
}

export default FaqManagement;
