import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Icon } from "../../components/Icons.jsx";
import { Field } from "../../components/masjid/ContactPersonForm.jsx";
import { WizardShell } from "../../components/wizard/WizardShell.jsx";
import MicButton from "../../components/MicButton.jsx";
import TagSelect from "../../components/profile/TagSelect.jsx";
import jobApi from "../../services/jobApi.js";
import userApi from "../../services/userApi.js";
import { useTranslation } from "../../i18n/LanguageContext.jsx";

const DESCRIPTION_MAX = 3000;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm() {
  return { title: "", description: "", jobType: "", experienceRequired: "", category: "", workMode: "", skills: [], location: "", salary: "", applicationDeadline: "", contactMethod: "" };
}

// A single full-page form, not a multi-step wizard like Masjid/Campaign —
// a job has no draft/submit/review lifecycle to step through (it publishes
// the moment it's saved), so one step is all there is. `embedded` mirrors
// MasjidWizard/CampaignWizard: rendered inline in My Community's own wall
// column (via Community.jsx, for /account/my-jobs/new and /:id) rather than
// as its own standalone page.
function JobForm({ embedded = false }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const backTo = embedded ? "/my-community" : "/account/my-jobs";
  const backLabel = embedded
    ? t("masjidWizard.backToCommunityWall", "Back to Community Wall")
    : t("jobForm.backToMyJobs", "Back to My Jobs");
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
  const [jobCategories, setJobCategories] = useState([]);

  useEffect(() => {
    userApi.get("/meta/employment-types").then(({ data }) => {
      setJobTypes(data.employmentTypes);
      setForm((f) => (f.jobType ? f : { ...f, jobType: data.employmentTypes[0]?.name || "" }));
    }).catch(() => {});
    userApi.get("/meta/experience-levels").then(({ data }) => setExperienceLevels(data.experienceLevels)).catch(() => {});
    userApi.get("/meta/skills").then(({ data }) => setMasterSkills(data.skills)).catch(() => {});
    userApi.get("/meta/job-categories").then(({ data }) => setJobCategories(data.jobCategories)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    jobApi.get(`/${id}`).then(({ data }) => {
      const j = data.job;
      setForm({
        title: j.title, description: j.description, jobType: j.jobType,
        experienceRequired: j.experienceRequired || "",
        category: j.category || "", workMode: j.workMode || "",
        skills: (j.skills || []).map((name, i) => ({ id: `existing-${i}`, name })),
        location: j.location, salary: j.salary || "",
        applicationDeadline: j.applicationDeadline || "", contactMethod: j.contactMethod || "",
      });
    }).catch(() => setErrors({ form: t("jobForm.errors.loadFailed", "Couldn't load this job.") })).finally(() => setLoading(false));
  }, [id, isEdit]);

  const setField = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: null, form: null }));
  };

  const addSkill = (option) => setForm((f) => ({ ...f, skills: [...f.skills, option] }));
  const removeSkill = (item) => setForm((f) => ({ ...f, skills: f.skills.filter((s) => s.id !== item.id) }));

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = t("jobForm.errors.titleRequired", "Job title is required.");
    if (!form.description.trim()) errs.description = t("jobForm.errors.descriptionRequired", "Job description is required.");
    if (!form.location.trim()) errs.location = t("jobForm.errors.locationRequired", "Location is required.");
    if (form.applicationDeadline && form.applicationDeadline < todayStr()) errs.applicationDeadline = t("jobForm.errors.deadlinePast", "Application deadline can't be in the past.");
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
      else setErrors({ form: resp?.message || t("jobForm.errors.saveFailed", "Couldn't save this job. Please try again.") });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <WizardShell embedded={embedded}><p>{t("masjidWizard.loading", "Loading…")}</p></WizardShell>;

  return (
    <WizardShell embedded={embedded}>
      <Link to={backTo} className="msj-back-link"><Icon name="chevronLeft" size={16} /> {backLabel}</Link>

      <div className="msj-wizard-center">
        {errors.form && <div className="auth-alert" style={{ marginTop: 16, marginBottom: 20 }}><Icon name="info" size={17} />{errors.form}</div>}

        <form onSubmit={submit} style={{ marginTop: 20 }}>
          <div className="card msj-step-card">
            <Field label={t("jobForm.fields.jobTitle", "Job Title")} required error={errors.title}>
              <input value={form.title} onChange={setField("title")} placeholder={t("jobForm.fields.jobTitlePlaceholder", "e.g. Weekend Qur'an Teacher")} maxLength={150} />
            </Field>

            <Field
              label={t("jobForm.fields.jobDescription", "Job Description")}
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
                  placeholder={t("jobForm.fields.descriptionPlaceholder", "Describe the role, responsibilities, and what makes a good fit")}
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
              <Field label={t("jobApply.panel.jobType", "Job Type")} required>
                <select value={form.jobType} onChange={setField("jobType")}>
                  {jobTypes.map((jt) => <option key={jt.id} value={jt.name}>{jt.name}</option>)}
                </select>
              </Field>
              <Field label={t("jobApply.panel.location", "Location")} required error={errors.location}>
                <input value={form.location} onChange={setField("location")} placeholder={t("jobForm.fields.locationPlaceholder", "e.g. Lucknow, India or Remote")} maxLength={150} />
              </Field>
            </div>

            <div className="msj-field-row">
              <Field label={t("jobForm.fields.requiredExperience", "Required Experience")} hint={t("jobForm.hints.optional", "Optional")}>
                <select value={form.experienceRequired} onChange={setField("experienceRequired")}>
                  <option value="">{t("jobForm.fields.notSpecified", "Not specified")}</option>
                  {experienceLevels.map((lvl) => <option key={lvl.id} value={lvl.name}>{lvl.name}</option>)}
                </select>
              </Field>
              <Field label={t("jobForm.fields.salary", "Salary / Compensation")} hint={t("jobForm.hints.optionalLeaveBlank", "Optional — leave blank if not applicable")}>
                <input value={form.salary} onChange={setField("salary")} placeholder={t("jobForm.fields.salaryPlaceholder", "e.g. ₹25,000-₹35,000/month or Volunteer")} maxLength={100} />
              </Field>
            </div>

            <div className="msj-field-row">
              <Field label={t("jobForm.fields.category", "Job Category")} hint={t("jobForm.hints.optional", "Optional")}>
                <select value={form.category} onChange={setField("category")}>
                  <option value="">{t("jobForm.fields.notSpecified", "Not specified")}</option>
                  {jobCategories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </Field>
              <Field label={t("jobForm.fields.workMode", "Work Mode")} hint={t("jobForm.hints.optional", "Optional")}>
                <select value={form.workMode} onChange={setField("workMode")}>
                  <option value="">{t("jobForm.fields.notSpecified", "Not specified")}</option>
                  <option value="on_site">{t("jobForm.workMode.onSite", "On-site")}</option>
                  <option value="remote">{t("jobForm.workMode.remote", "Remote")}</option>
                  <option value="hybrid">{t("jobForm.workMode.hybrid", "Hybrid")}</option>
                </select>
              </Field>
            </div>

            <Field label={t("jobs.skillsFilter.heading", "Skills / Qualifications")} hint={t("jobForm.hints.optionalSearchSelect", "Optional — search and select any that apply")}>
              <TagSelect
                options={masterSkills}
                selected={form.skills}
                placeholder={t("jobForm.fields.skillsSearchPlaceholder", "Search skills — Tajweed, Arabic, Public Speaking…")}
                onSelect={addSkill}
                onRemove={removeSkill}
                allowCustom={false}
              />
            </Field>

            <div className="msj-field-row">
              <Field label={t("jobForm.fields.applicationDeadline", "Application Deadline")} hint={t("jobForm.hints.optional", "Optional")} error={errors.applicationDeadline}>
                <input type="date" min={todayStr()} value={form.applicationDeadline} onChange={setField("applicationDeadline")} />
              </Field>
              <Field label={t("jobForm.fields.contactMethod", "Contact / Application Method")} hint={t("jobForm.hints.optionalShownToApplicants", "Optional — shown to applicants who'd rather reach out directly")}>
                <input value={form.contactMethod} onChange={setField("contactMethod")} placeholder={t("jobForm.fields.contactMethodPlaceholder", "e.g. an email address or phone number")} maxLength={150} />
              </Field>
            </div>

            <div className="msj-prayer-savebar" style={{ marginTop: 8 }}>
              <Link to={backTo} className="btn btn-outline-ink">{t("masjidWizard.contacts.cancel", "Cancel")}</Link>
              <button type="submit" className="btn btn-gold" disabled={saving}>
                {saving ? t("masjidWizard.actions.saving", "Saving…") : isEdit ? t("jobForm.actions.saveChanges", "Save Changes") : t("jobForm.actions.postJob", "Post Job")} <span className="btn-arrow">→</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </WizardShell>
  );
}

export default JobForm;
