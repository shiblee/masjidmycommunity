import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Icon } from "../../components/Icons.jsx";
import { Field } from "../../components/masjid/ContactPersonForm.jsx";
import { WizardShell } from "../../components/wizard/WizardShell.jsx";
import MicButton from "../../components/MicButton.jsx";
import TagSelect from "../../components/profile/TagSelect.jsx";
import jobApi from "../../services/jobApi.js";
import userApi from "../../services/userApi.js";

const DESCRIPTION_MAX = 3000;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm() {
  return { title: "", description: "", jobType: "", experienceRequired: "", skills: [], location: "", salary: "", applicationDeadline: "", contactMethod: "" };
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

  // Job Type, Required Experience, and Skills are all admin-managed master
  // data (Admin Panel -> Meta -> Employment Types / Experience Level /
  // Skill) — the same lists a user's own profile already draws on, rather
  // than separate hardcoded options here.
  const [jobTypes, setJobTypes] = useState([]);
  const [experienceLevels, setExperienceLevels] = useState([]);
  const [masterSkills, setMasterSkills] = useState([]);

  useEffect(() => {
    userApi.get("/meta/employment-types").then(({ data }) => {
      setJobTypes(data.employmentTypes);
      setForm((f) => (f.jobType ? f : { ...f, jobType: data.employmentTypes[0]?.name || "" }));
    }).catch(() => {});
    userApi.get("/meta/experience-levels").then(({ data }) => setExperienceLevels(data.experienceLevels)).catch(() => {});
    userApi.get("/meta/skills").then(({ data }) => setMasterSkills(data.skills)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    jobApi.get(`/${id}`).then(({ data }) => {
      const j = data.job;
      setForm({
        title: j.title, description: j.description, jobType: j.jobType,
        experienceRequired: j.experienceRequired || "",
        skills: (j.skills || []).map((name, i) => ({ id: `existing-${i}`, name })),
        location: j.location, salary: j.salary || "",
        applicationDeadline: j.applicationDeadline || "", contactMethod: j.contactMethod || "",
      });
    }).catch(() => setErrors({ form: "Couldn't load this job." })).finally(() => setLoading(false));
  }, [id, isEdit]);

  const setField = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: null, form: null }));
  };

  const addSkill = (option) => setForm((f) => ({ ...f, skills: [...f.skills, option] }));
  const removeSkill = (item) => setForm((f) => ({ ...f, skills: f.skills.filter((s) => s.id !== item.id) }));

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = "Job title is required.";
    if (!form.description.trim()) errs.description = "Job description is required.";
    if (!form.location.trim()) errs.location = "Location is required.";
    if (form.applicationDeadline && form.applicationDeadline < todayStr()) errs.applicationDeadline = "Application deadline can't be in the past.";
    return errs;
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const payload = { ...form, skills: form.skills.map((s) => s.name) };
      if (isEdit) {
        await jobApi.patch(`/${id}`, payload);
        navigate("/account/my-jobs");
      } else {
        const { data } = await jobApi.post("/", payload);
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

            <Field
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
                  placeholder="Describe the role, responsibilities, and what makes a good fit"
                />
                <MicButton
                  onTranscript={(text) => {
                    setForm((f) => ({ ...f, description: text.slice(0, DESCRIPTION_MAX) }));
                    setErrors((er) => ({ ...er, description: null, form: null }));
                  }}
                  className="msj-about-mic"
                />
              </div>
            </Field>

            <div className="msj-field-row">
              <Field label="Job Type" required>
                <select value={form.jobType} onChange={setField("jobType")}>
                  {jobTypes.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
              </Field>
              <Field label="Location" required error={errors.location}>
                <input value={form.location} onChange={setField("location")} placeholder="e.g. Lucknow, India or Remote" maxLength={150} />
              </Field>
            </div>

            <div className="msj-field-row">
              <Field label="Required Experience" hint="Optional">
                <select value={form.experienceRequired} onChange={setField("experienceRequired")}>
                  <option value="">Not specified</option>
                  {experienceLevels.map((lvl) => <option key={lvl.id} value={lvl.name}>{lvl.name}</option>)}
                </select>
              </Field>
              <Field label="Salary / Compensation" hint="Optional — leave blank if not applicable">
                <input value={form.salary} onChange={setField("salary")} placeholder="e.g. ₹25,000-₹35,000/month or Volunteer" maxLength={100} />
              </Field>
            </div>

            <Field label="Skills / Qualifications" hint="Optional — search and select any that apply">
              <TagSelect
                options={masterSkills}
                selected={form.skills}
                placeholder="Search skills — Tajweed, Arabic, Public Speaking…"
                onSelect={addSkill}
                onRemove={removeSkill}
                allowCustom={false}
              />
            </Field>

            <div className="msj-field-row">
              <Field label="Application Deadline" hint="Optional" error={errors.applicationDeadline}>
                <input type="date" min={todayStr()} value={form.applicationDeadline} onChange={setField("applicationDeadline")} />
              </Field>
              <Field label="Contact / Application Method" hint="Optional — shown to applicants who'd rather reach out directly">
                <input value={form.contactMethod} onChange={setField("contactMethod")} placeholder="e.g. an email address or phone number" maxLength={150} />
              </Field>
            </div>

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
