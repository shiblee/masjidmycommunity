import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Icon } from "../../components/Icons.jsx";
import { Field } from "../../components/masjid/ContactPersonForm.jsx";
import { WizardShell } from "../../components/wizard/WizardShell.jsx";
import jobApi from "../../services/jobApi.js";

const JOB_TYPES = [
  { value: "full_time", label: "Full-Time" },
  { value: "part_time", label: "Part-Time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
  { value: "volunteer", label: "Volunteer" },
];

function emptyForm() {
  return { title: "", description: "", jobType: "full_time", experienceRequired: "", skills: "", location: "", salary: "", applicationDeadline: "", contactMethod: "" };
}

// A single full-page form, not a multi-step wizard like Masjid/Campaign —
// a job has no draft/submit/review lifecycle to step through (it publishes
// the moment it's saved), so one step is all there is. `embedded` mirrors
// MasjidWizard/CampaignWizard: rendered inline in My Community's own wall
// column (via Community.jsx, for /account/my-jobs/new and /:id) rather than
// as its own standalone page.
function JobForm({ embedded = false }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const backTo = embedded ? "/my-community" : "/account/my-jobs";
  const backLabel = embedded ? "Back to Community Wall" : "Back to My Jobs";
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isEdit) return;
    jobApi.get(`/${id}`).then(({ data }) => {
      const j = data.job;
      setForm({
        title: j.title, description: j.description, jobType: j.jobType,
        experienceRequired: j.experienceRequired || "", skills: j.skills || "",
        location: j.location, salary: j.salary || "",
        applicationDeadline: j.applicationDeadline || "", contactMethod: j.contactMethod || "",
      });
    }).catch(() => setErrors({ form: "Couldn't load this job." })).finally(() => setLoading(false));
  }, [id, isEdit]);

  const setField = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: null, form: null }));
  };

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = "Job title is required.";
    if (!form.description.trim()) errs.description = "Job description is required.";
    if (!form.location.trim()) errs.location = "Location is required.";
    return errs;
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      if (isEdit) {
        await jobApi.patch(`/${id}`, form);
        navigate("/account/my-jobs");
      } else {
        const { data } = await jobApi.post("/", form);
        navigate(`/account/my-jobs`, { state: { justPosted: data.job.slug } });
      }
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.field) setErrors({ [resp.field]: resp.message });
      else setErrors({ form: resp?.message || "Couldn't save this job. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <WizardShell embedded={embedded}><p>Loading…</p></WizardShell>;

  return (
    <WizardShell embedded={embedded}>
      <Link to={backTo} className="msj-back-link"><Icon name="chevronLeft" size={16} /> {backLabel}</Link>

      <div className="msj-wizard-center">
        {errors.form && <div className="auth-alert" style={{ marginTop: 16, marginBottom: 20 }}><Icon name="info" size={17} />{errors.form}</div>}

        <form onSubmit={submit} style={{ marginTop: 20 }}>
          <div className="card msj-step-card">
            <Field label="Job Title" required error={errors.title}>
              <input value={form.title} onChange={setField("title")} placeholder="e.g. Weekend Qur'an Teacher" maxLength={150} />
            </Field>

            <Field label="Job Description" required error={errors.description}>
              <textarea rows={6} value={form.description} onChange={setField("description")} placeholder="Describe the role, responsibilities, and what makes a good fit" />
            </Field>

            <div className="msj-field-row">
              <Field label="Job Type" required>
                <select value={form.jobType} onChange={setField("jobType")}>
                  {JOB_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
              <Field label="Location" required error={errors.location}>
                <input value={form.location} onChange={setField("location")} placeholder="e.g. Lucknow, India or Remote" maxLength={150} />
              </Field>
            </div>

            <div className="msj-field-row">
              <Field label="Required Experience" hint="Optional">
                <input value={form.experienceRequired} onChange={setField("experienceRequired")} placeholder="e.g. 2-4 years" maxLength={100} />
              </Field>
              <Field label="Skills / Qualifications" hint="Optional">
                <input value={form.skills} onChange={setField("skills")} placeholder="e.g. Tajweed, Arabic, Public Speaking" maxLength={255} />
              </Field>
            </div>

            <div className="msj-field-row">
              <Field label="Salary / Compensation" hint="Optional — leave blank if not applicable">
                <input value={form.salary} onChange={setField("salary")} placeholder="e.g. ₹25,000-₹35,000/month or Volunteer" maxLength={100} />
              </Field>
              <Field label="Application Deadline" hint="Optional">
                <input type="date" value={form.applicationDeadline} onChange={setField("applicationDeadline")} />
              </Field>
            </div>

            <Field label="Contact / Application Method" hint="Optional — shown to applicants who'd rather reach out directly">
              <input value={form.contactMethod} onChange={setField("contactMethod")} placeholder="e.g. an email address or phone number" maxLength={150} />
            </Field>

            <div className="msj-prayer-savebar" style={{ marginTop: 8 }}>
              <Link to={backTo} className="btn btn-outline-ink">Cancel</Link>
              <button type="submit" className="btn btn-gold" disabled={saving}>
                {saving ? "Saving…" : isEdit ? "Save Changes" : "Post Job"} <span className="btn-arrow">→</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </WizardShell>
  );
}

export default JobForm;
