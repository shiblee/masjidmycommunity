import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import adminApi from "../services/adminApi.js";
import MicButton from "../../components/MicButton.jsx";
import TagSelect from "../../components/profile/TagSelect.jsx";
import { formatDate, formatDateTime } from "../../utils/formatDateTime.js";

const DESCRIPTION_MAX = 3000;
const STATUSES = ["active", "closed", "expired", "deleted"];
const APPLICATION_STATUS_LABEL = { applied: "Applied", under_review: "Under Review", shortlisted: "Shortlisted", rejected: "Rejected", hired: "Selected / Hired" };
const APPLICATION_STATUSES = Object.keys(APPLICATION_STATUS_LABEL);

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function Section({ title, children }) {
  return (
    <div className="amx-card amx-panel" style={{ marginBottom: 20 }}>
      <div className="amx-panel-head"><h3>{title}</h3></div>
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <span className="amx-panel-sub" style={{ display: "block" }}>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

// Same label + mandatory-* + red-error-below pattern CampaignReview.jsx's
// own AField uses, duplicated per this codebase's existing per-page
// constant convention rather than shared.
function AField({ label, children, required, error, hint, labelExtra }) {
  return (
    <div className="amx-form-group">
      {labelExtra ? (
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 7 }}>
          <label style={{ marginBottom: 0 }}>{label}{required && <span className="amx-required">*</span>}</label>
          {labelExtra}
        </div>
      ) : (
        <label>{label}{required && <span className="amx-required">*</span>}</label>
      )}
      {children}
      {error ? (
        <div className="amx-field-error"><Icon name="info" size={14} />{error}</div>
      ) : hint ? (
        <span className="amx-panel-sub" style={{ display: "block", marginTop: 6 }}>{hint}</span>
      ) : null}
    </div>
  );
}

// Admin can edit every job field regardless of current status — unlike the
// owner's own JobForm, there's no draft/lifecycle gate here. Sourced from
// the same three admin-managed meta lists (Employment Type / Experience
// Level / Skill) the owner-side form uses, just fetched via the admin-
// mounted equivalents since adminApi carries an admin token, not a user
// one (/api/admin/employment-types etc., not /api/users/meta/...).
function JobDetailsForm({ id, job, onSaved, showToast }) {
  const [form, setForm] = useState({
    title: job.title || "", description: job.description || "", jobType: job.jobType || "",
    experienceRequired: job.experienceRequired || "", skills: (job.skills || []).map((name, i) => ({ id: `existing-${i}`, name })),
    location: job.location || "", salary: job.salary || "", applicationDeadline: job.applicationDeadline || "",
    contactMethod: job.contactMethod || "",
  });
  const [jobTypes, setJobTypes] = useState([]);
  const [experienceLevels, setExperienceLevels] = useState([]);
  const [masterSkills, setMasterSkills] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.get("/employment-types").then(({ data }) => setJobTypes(data.employmentTypes.filter((t) => t.isActive))).catch(() => {});
    adminApi.get("/experience-levels").then(({ data }) => setExperienceLevels(data.experienceLevels.filter((l) => l.isActive))).catch(() => {});
    adminApi.get("/skills").then(({ data }) => setMasterSkills(data.skills.filter((s) => s.isActive))).catch(() => {});
  }, []);

  const setField = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: null, form: null }));
  };
  const addSkill = (option) => setForm((f) => ({ ...f, skills: [...f.skills, option] }));
  const removeSkill = (item) => setForm((f) => ({ ...f, skills: f.skills.filter((s) => s.id !== item.id) }));

  const save = async () => {
    const errs = {};
    if (!form.title.trim()) errs.title = "Job title is required.";
    if (!form.description.trim()) errs.description = "Job description is required.";
    if (!form.location.trim()) errs.location = "Location is required.";
    if (form.applicationDeadline && form.applicationDeadline < todayStr()) errs.applicationDeadline = "Application deadline can't be in the past.";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    setErrors({});
    try {
      const payload = { ...form, skills: form.skills.map((s) => s.name) };
      const { data } = await adminApi.patch(`/jobs/${id}`, payload);
      onSaved(data.job);
      showToast("Job updated.");
    } catch (err) {
      const field = err.response?.data?.field;
      const message = err.response?.data?.message || "Couldn't save changes.";
      setErrors(field ? { [field]: message } : { form: message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section title="Job Details">
      {errors.form && <div className="amx-form-error" style={{ marginBottom: 16 }}><Icon name="info" size={16} />{errors.form}</div>}

      <AField label="Job Title" required error={errors.title}>
        <input value={form.title} onChange={setField("title")} maxLength={150} />
      </AField>

      <AField
        label="Job Description"
        required
        error={errors.description}
        labelExtra={<span className="pf-char-counter">{form.description.length}/{DESCRIPTION_MAX}</span>}
      >
        <div className="msj-about-wrap">
          <textarea
            rows={6}
            maxLength={DESCRIPTION_MAX}
            value={form.description}
            onChange={setField("description")}
          />
          <MicButton onTranscript={(text) => setForm((f) => ({ ...f, description: text.slice(0, DESCRIPTION_MAX) }))} className="msj-about-mic" />
        </div>
      </AField>

      <div className="msj-field-row">
        <AField label="Job Type" required>
          <select value={form.jobType} onChange={setField("jobType")}>
            {jobTypes.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
        </AField>
        <AField label="Location" required error={errors.location}>
          <input value={form.location} onChange={setField("location")} maxLength={150} />
        </AField>
      </div>

      <div className="msj-field-row">
        <AField label="Required Experience" hint="Optional">
          <select value={form.experienceRequired} onChange={setField("experienceRequired")}>
            <option value="">Not specified</option>
            {experienceLevels.map((lvl) => <option key={lvl.id} value={lvl.name}>{lvl.name}</option>)}
          </select>
        </AField>
        <AField label="Salary / Compensation" hint="Optional">
          <input value={form.salary} onChange={setField("salary")} maxLength={100} />
        </AField>
      </div>

      <AField label="Skills / Qualifications" hint="Optional — search and select any that apply">
        <TagSelect
          options={masterSkills}
          selected={form.skills}
          placeholder="Search skills — Tajweed, Arabic, Public Speaking…"
          onSelect={addSkill}
          onRemove={removeSkill}
          allowCustom={false}
        />
      </AField>

      <div className="msj-field-row">
        <AField label="Application Deadline" hint="Optional — future dates only" error={errors.applicationDeadline}>
          <input type="date" min={todayStr()} value={form.applicationDeadline || ""} onChange={setField("applicationDeadline")} />
        </AField>
        <AField label="Contact / Application Method" hint="Optional">
          <input value={form.contactMethod} onChange={setField("contactMethod")} maxLength={150} />
        </AField>
      </div>

      <button className="amx-btn amx-btn-accent" onClick={save} disabled={saving} style={{ marginTop: 8 }}>
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </Section>
  );
}

// Same underlying JobApplication data as the job creator's own
// /account/my-jobs/:id/applications screen — full admin visibility and the
// same status-management action, just via the admin-scoped route.
function ApplicationRow({ id, application, onUpdated }) {
  const [status, setStatus] = useState(application.status);
  const [remarks, setRemarks] = useState(application.remarks || "");
  const [saving, setSaving] = useState(false);
  const dirty = status !== application.status || remarks !== (application.remarks || "");

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await adminApi.patch(`/jobs/${id}/applications/${application.id}`, { status, remarks });
      onUpdated(data.application);
    } catch {
      // Row-level failure — status/remarks simply stay unsaved; the admin can retry.
    } finally {
      setSaving(false);
    }
  };

  const downloadResume = async () => {
    try {
      const res = await adminApi.get(`/jobs/${id}/applications/${application.id}/resume`, { responseType: "blob" });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = application.resumeFileName || "resume";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      // No resume on file, or the download failed — nothing to clean up.
    }
  };

  return (
    <div style={{ padding: "14px 0", borderBottom: "1px solid var(--a-border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <strong>{application.applicant?.fullName || "A candidate"}</strong>
          <span className="amx-panel-sub" style={{ marginLeft: 8 }}>{application.applicant?.email}</span>
        </div>
        <span className="amx-panel-sub">{formatDateTime(application.createdAt)}</span>
      </div>
      {application.coverNote && <p style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{application.coverNote}</p>}
      {application.hasResume && (
        <button type="button" className="amx-btn amx-btn-sm amx-btn-outline" style={{ marginTop: 8 }} onClick={downloadResume}>
          Download Resume
        </button>
      )}
      <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{APPLICATION_STATUS_LABEL[s]}</option>)}
        </select>
        <input
          type="text"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Internal remarks…"
          style={{ flex: 1, minWidth: 180 }}
        />
        <button type="button" className="amx-btn amx-btn-sm amx-btn-accent" disabled={!dirty || saving} onClick={save}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

function ApplicationsSection({ id }) {
  const [applications, setApplications] = useState(null);

  useEffect(() => {
    adminApi.get(`/jobs/${id}/applications`).then(({ data }) => setApplications(data.applications)).catch(() => setApplications([]));
  }, [id]);

  const onUpdated = (updated) => {
    setApplications((list) => list.map((a) => (a.id === updated.id ? updated : a)));
  };

  return (
    <Section title={`Applications${applications ? ` (${applications.length})` : ""}`}>
      {applications?.map((a) => <ApplicationRow key={a.id} id={id} application={a} onUpdated={onUpdated} />)}
      {applications?.length === 0 && <p>No applications yet.</p>}
      {!applications && <p>Loading…</p>}
    </Section>
  );
}

function JobReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [poster, setPoster] = useState(null);
  const [history, setHistory] = useState([]);
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [statusChoice, setStatusChoice] = useState("");

  const load = () => {
    adminApi.get(`/jobs/${id}`).then(({ data }) => {
      setJob(data.job);
      setPoster(data.poster);
      setHistory(data.history);
    });
  };

  useEffect(() => { load(); }, [id]);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const wasAdminCreated = history.some((h) => h.action === "admin_created");

  const changeStatus = async () => {
    if (!statusChoice || statusChoice === job.status) return;
    setBusy(true);
    try {
      const { data } = await adminApi.patch(`/jobs/${id}/status`, { status: statusChoice });
      setJob(data.job);
      load();
      showToast(`Status changed to ${statusChoice}.`);
      setStatusChoice("");
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't change status.");
    } finally {
      setBusy(false);
    }
  };

  const toggleModeration = async () => {
    setBusy(true);
    try {
      const next = job.moderationStatus === "active" ? "under_review" : "active";
      const { data } = await adminApi.patch(`/jobs/${id}/moderation`, { moderationStatus: next });
      setJob(data.job);
      load();
      showToast(next === "active" ? "Restored to public view." : "Hidden from public view.");
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't update visibility.");
    } finally {
      setBusy(false);
    }
  };

  if (!job) return <div className="amx-empty"><Icon name="briefcase" /><strong>Loading…</strong></div>;

  return (
    <>
      <div className="amx-page-head">
        <div>
          <button className="amx-back-link" onClick={() => navigate("/admin/jobs")}>
            <Icon name="arrowRight" size={14} style={{ transform: "rotate(180deg)" }} /> Back to Jobs
          </button>
          <div style={{ marginTop: 12 }}>
            <h1 style={{ margin: 0 }}>{job.title}</h1>
            <p style={{ margin: "2px 0 0" }}>{job.location} · Posted {formatDate(job.createdAt)}</p>
          </div>
        </div>
        <div className="amx-page-actions" style={{ alignItems: "center", gap: 10 }}>
          {wasAdminCreated && <span className="amx-badge amx-badge-neutral">Created by Admin</span>}
          {job.moderationStatus === "under_review" && <span className="amx-badge amx-badge-warn">Hidden from public</span>}
          <StatusBadge status={job.status} />
        </div>
      </div>

      <div className="amx-editor-layout">
        <div>
          <JobDetailsForm id={id} job={job} onSaved={setJob} showToast={showToast} />

          <ApplicationsSection id={id} />

          <Section title="Job History">
            {history.map((h) => (
              <div key={h.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--a-border)" }}>
                <strong style={{ textTransform: "capitalize" }}>{h.action.replace(/_/g, " ")}</strong>
                <span className="amx-panel-sub" style={{ marginLeft: 8 }}>{formatDateTime(h.createdAt)} · {h.actorType === "admin" ? h.actorName || "Admin" : "Owner"}</span>
                {h.note && <p style={{ marginTop: 4 }}>{h.note}</p>}
              </div>
            ))}
            {history.length === 0 && <p>No history yet.</p>}
          </Section>
        </div>

        <div>
          <div className="amx-card amx-panel" style={{ marginBottom: 20 }}>
            <div className="amx-panel-head"><h3>Posted By</h3></div>
            <Row label="Name" value={poster?.fullName} />
            <Row label="Email" value={poster?.email} />
            <Row label="Mobile" value={poster?.mobile} />
            <Row label="Member Since" value={poster?.createdAt ? formatDate(poster.createdAt) : null} />
            <div className="amx-dropdown-sep" style={{ margin: "16px 0" }} />
            <Row label="Views" value={job.viewCount} />
            <Row label="Applications" value={job.applicationCount} />
          </div>

          <div className="amx-card amx-panel">
            <div className="amx-panel-head"><h3>Status</h3></div>
            <AField label="Change Status">
              <select value={statusChoice} onChange={(e) => setStatusChoice(e.target.value)}>
                <option value="">Select a status…</option>
                {STATUSES.filter((s) => s !== job.status).map((s) => (
                  <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </AField>
            <button className="amx-btn amx-btn-accent" style={{ width: "100%" }} disabled={busy || !statusChoice} onClick={changeStatus}>
              Update Status
            </button>

            <div className="amx-dropdown-sep" style={{ margin: "18px 0" }} />
            <button className="amx-btn amx-btn-outline" style={{ width: "100%" }} disabled={busy} onClick={toggleModeration}>
              {job.moderationStatus === "active" ? "Hide from Public View" : "Restore to Public View"}
            </button>
          </div>
        </div>
      </div>

      {toast && <div className="amx-toast"><Icon name="check" />{toast}</div>}
    </>
  );
}

export default JobReview;
