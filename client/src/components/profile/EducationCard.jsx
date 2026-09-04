import React, { useEffect, useRef, useState } from "react";
import { Icon } from "../Icons.jsx";
import MicButton from "../MicButton.jsx";
import userApi from "../../services/userApi.js";
import adminApi from "../../admin/services/adminApi.js";
import { useTranslation } from "../../i18n/LanguageContext.jsx";

const DESCRIPTION_MAX = 1000;
const DESCRIPTION_TRUNCATE = 220;
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 85 }, (_, i) => CURRENT_YEAR - i);

function editConfig(mode, targetUserId) {
  return mode === "admin" ? { client: adminApi, base: `/users/${targetUserId}` } : { client: userApi, base: "/me" };
}

function metaPath(mode, path) {
  return mode === "admin" ? `/${path}` : `/meta/${path}`;
}

// Resolves an entry's saved value against the loaded master list: if it
// matches an active option exactly, that option is the "choice"; otherwise
// (a custom/legacy value, or the literal "Other" selection) the choice
// becomes "Other" and the real text moves into a companion "please specify"
// field. Runs once, right after the options finish loading.
function useOtherField(initialValue, options) {
  const [choice, setChoice] = useState(initialValue || "");
  const [otherText, setOtherText] = useState("");
  const resolvedRef = useRef(false);

  useEffect(() => {
    if (resolvedRef.current || !options.length) return;
    if (initialValue && !options.includes(initialValue)) {
      setChoice("Other");
      setOtherText(initialValue);
    }
    resolvedRef.current = true;
  }, [options, initialValue]);

  const finalValue = choice === "Other" ? otherText.trim() : choice;
  return { choice, setChoice, otherText, setOtherText, finalValue };
}

function useOutsideClick(onOutside) {
  const ref = useRef(null);
  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onOutside();
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [onOutside]);
  return ref;
}

function SearchSelect({ label, placeholder, value, options, onChange, t }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useOutsideClick(() => setOpen(false));
  const filtered = options.filter((o) => o.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="pf-dob-field" ref={wrapRef}>
      <button
        type="button"
        className={`pf-dob-trigger${open ? " open" : ""}`}
        onClick={() => { setOpen((o) => !o); setQuery(""); }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
      >
        <span className={value ? "" : "pf-dob-placeholder"}>{value || placeholder}</span>
        <Icon name="chevronDown" size={14} />
      </button>
      {open && (
        <ul className="pf-dob-panel pf-dob-panel-wide" role="listbox" aria-label={label}>
          <li>
            <input
              className="pf-search-select-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("education.searchPlaceholder", "Search…")}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          </li>
          {filtered.length === 0 && <li className="pf-search-select-empty">{t("education.noMatches", "No matches")}</li>}
          {filtered.map((opt) => (
            <li key={opt}>
              <button type="button" className={opt === value ? "selected" : ""} onClick={() => { onChange(opt); setOpen(false); setQuery(""); }}>
                {opt}
                {opt === value && <Icon name="check" size={13} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function YearSelect({ label, placeholder, value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useOutsideClick(() => setOpen(false));

  return (
    <div className="pf-dob-field" ref={wrapRef}>
      <button
        type="button"
        className={`pf-dob-trigger${open ? " open" : ""}`}
        onClick={() => !disabled && setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        disabled={disabled}
      >
        <span className={value ? "" : "pf-dob-placeholder"}>{value || placeholder}</span>
        <Icon name="chevronDown" size={14} />
      </button>
      {open && (
        <ul className="pf-dob-panel" role="listbox" aria-label={label}>
          {YEARS.map((y) => (
            <li key={y}>
              <button type="button" className={String(y) === String(value) ? "selected" : ""} onClick={() => { onChange(String(y)); setOpen(false); }}>
                {y}
                {String(y) === String(value) && <Icon name="check" size={13} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Chrome-free form — rendered directly inside the card's own content area
// (swapped in place of the list) instead of a popup, matching the same
// full-page pattern already used by Profile Details / Security.
function EntryForm({ entry, client, base, mode, language, onCancel, onSaved, t }) {
  const isEdit = !!entry;

  const [levelOptions, setLevelOptions] = useState([]);
  const [degreeOptions, setDegreeOptions] = useState([]);
  const [institutionOptions, setInstitutionOptions] = useState([]);
  const [fieldOptions, setFieldOptions] = useState([]);

  useEffect(() => {
    const load = (path, setter, key) => {
      client.get(metaPath(mode, path)).then(({ data }) => {
        const rows = data[key] || [];
        setter(rows.filter((r) => r.isActive).map((r) => r.name));
      }).catch(() => {});
    };
    load("education-levels", setLevelOptions, "educationLevels");
    load("degrees", setDegreeOptions, "degrees");
    load("institutions", setInstitutionOptions, "institutions");
    load("fields-of-study", setFieldOptions, "fieldsOfStudy");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const level = useOtherField(entry?.level, levelOptions);
  const degree = useOtherField(entry?.degree, degreeOptions);
  const institution = useOtherField(entry?.institution, institutionOptions);
  const fieldOfStudy = useOtherField(entry?.fieldOfStudy, fieldOptions);

  const [form, setForm] = useState({
    startYear: entry?.startYear ? String(entry.startYear) : "",
    endYear: entry?.endYear ? String(entry.endYear) : "",
    isCurrentlyStudying: entry?.isCurrentlyStudying || false,
    location: entry?.location || "",
    description: entry?.description || "",
  });

  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [enhanceError, setEnhanceError] = useState("");
  const [enhanceNote, setEnhanceNote] = useState("");

  const degreeRef = useRef(null);
  const institutionRef = useRef(null);
  const startYearRef = useRef(null);
  const endYearRef = useRef(null);
  const levelOtherRef = useRef(null);
  const degreeOtherRef = useRef(null);
  const institutionOtherRef = useRef(null);

  const enhanceWithAi = async () => {
    setEnhancing(true);
    setEnhanceError("");
    setEnhanceNote("");
    try {
      const { data } = await client.post(`${base}/education/enhance`, {
        level: level.finalValue,
        degree: degree.finalValue,
        institution: institution.finalValue,
        fieldOfStudy: fieldOfStudy.finalValue,
        notes: form.description,
        languageCode: language,
      });
      setForm((f) => ({ ...f, description: (data.description || f.description).slice(0, DESCRIPTION_MAX) }));
      setEnhanceNote(t("education.enhanceApplied", "AI suggestion applied — review and edit before saving."));
    } catch (err) {
      setEnhanceError(err.response?.data?.message || t("education.enhanceError", "Couldn't enhance this entry right now."));
    } finally {
      setEnhancing(false);
    }
  };

  const buildErrors = () => {
    const nextErrors = {};
    if (level.choice === "Other" && !level.otherText.trim()) nextErrors.levelOther = t("education.otherRequiredError", "Please specify.");
    if (!degree.finalValue) nextErrors.degree = t("education.degreeRequiredError", "Degree/qualification is required.");
    if (degree.choice === "Other" && !degree.otherText.trim()) nextErrors.degreeOther = t("education.otherRequiredError", "Please specify.");
    if (!institution.finalValue) nextErrors.institution = t("education.institutionRequiredError", "Institution is required.");
    if (institution.choice === "Other" && !institution.otherText.trim()) nextErrors.institutionOther = t("education.otherRequiredError", "Please specify.");
    if (!form.startYear) nextErrors.startYear = t("education.startYearRequiredError", "Start year is required.");
    if (!form.isCurrentlyStudying && form.endYear && form.startYear && Number(form.endYear) < Number(form.startYear)) {
      nextErrors.endYear = t("education.yearOrderError", "End year can't be before the start year.");
    }
    if (form.description.length > DESCRIPTION_MAX) {
      nextErrors.description = t("education.descriptionMaxError", `Description must be ${DESCRIPTION_MAX} characters or fewer.`);
    }
    return nextErrors;
  };

  const fieldRefs = { levelOther: levelOtherRef, degree: degreeRef, degreeOther: degreeOtherRef, institution: institutionRef, institutionOther: institutionOtherRef, startYear: startYearRef, endYear: endYearRef };

  const onFieldBlur = (field) => {
    const nextErrors = buildErrors();
    setErrors((er) => ({ ...er, [field]: nextErrors[field] || null }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const fieldOrder = ["levelOther", "degree", "degreeOther", "institution", "institutionOther", "startYear", "endYear"];
    const nextErrors = buildErrors();
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      const firstInvalid = fieldOrder.find((f) => nextErrors[f]);
      fieldRefs[firstInvalid]?.current?.focus();
      return;
    }
    setSaving(true);
    setError("");
    setErrors({});
    try {
      const payload = {
        level: level.finalValue || null,
        degree: degree.finalValue,
        institution: institution.finalValue,
        fieldOfStudy: fieldOfStudy.finalValue || null,
        startYear: Number(form.startYear),
        endYear: form.isCurrentlyStudying ? null : form.endYear ? Number(form.endYear) : null,
        isCurrentlyStudying: form.isCurrentlyStudying,
        location: form.location,
        description: form.description,
      };
      const { data } = isEdit
        ? await client.patch(`${base}/education/${entry.id}`, payload)
        : await client.post(`${base}/education`, payload);
      onSaved(data.education, isEdit);
    } catch (err) {
      setError(err.response?.data?.message || t("education.saveError", "Couldn't save this entry."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button type="button" className="profile-form-back" onClick={onCancel}>
        <Icon name="chevronLeft" size={15} /> {t("education.backToList", "Back to Education")}
      </button>
      <h3 className="profile-form-title">{isEdit ? t("education.editTitle", "Edit Education") : t("education.addTitle", "Add Education")}</h3>
      <form onSubmit={submit} noValidate>
        {error && <div className="auth-alert" style={{ marginBottom: 16 }}><Icon name="bulb" size={17} />{error}</div>}

        <div className="auth-field">
          <label>{t("education.level", "Education Level")}</label>
          <select value={level.choice} onChange={(e) => level.setChoice(e.target.value)}>
            <option value="">{t("education.level.select", "Select")}</option>
            {levelOptions.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          {level.choice === "Other" && (
            <div className={`auth-field${errors.levelOther ? " has-error" : ""}`} style={{ marginTop: 8 }}>
              <label>{t("education.pleaseSpecify", "Please specify")} <span className="pf-required">*</span></label>
              <input
                ref={levelOtherRef}
                value={level.otherText}
                onChange={(e) => { level.setOtherText(e.target.value); setErrors((er) => ({ ...er, levelOther: null })); }}
                onBlur={() => onFieldBlur("levelOther")}
              />
              {errors.levelOther && <span className="auth-field-error">{errors.levelOther}</span>}
            </div>
          )}
        </div>

        <div className={`auth-field${errors.degree ? " has-error" : ""}`}>
          <label>{t("education.degree", "Degree / Qualification")} <span className="pf-required">*</span></label>
          <SearchSelect
            label={t("education.degree", "Degree / Qualification")}
            placeholder={t("education.degreePlaceholder", "Select a degree…")}
            value={degree.choice}
            options={degreeOptions}
            onChange={(v) => { degree.setChoice(v); setErrors((er) => ({ ...er, degree: null })); }}
            t={t}
          />
          {errors.degree && <span className="auth-field-error">{errors.degree}</span>}
          {degree.choice === "Other" && (
            <div className={`auth-field${errors.degreeOther ? " has-error" : ""}`} style={{ marginTop: 8 }}>
              <label>{t("education.pleaseSpecify", "Please specify")} <span className="pf-required">*</span></label>
              <input
                ref={degreeOtherRef}
                value={degree.otherText}
                onChange={(e) => { degree.setOtherText(e.target.value); setErrors((er) => ({ ...er, degreeOther: null })); }}
                onBlur={() => onFieldBlur("degreeOther")}
              />
              {errors.degreeOther && <span className="auth-field-error">{errors.degreeOther}</span>}
            </div>
          )}
        </div>

        <div className={`auth-field${errors.institution ? " has-error" : ""}`}>
          <label>{t("education.institution", "Institution / University")} <span className="pf-required">*</span></label>
          <SearchSelect
            label={t("education.institution", "Institution / University")}
            placeholder={t("education.institutionPlaceholder", "Select a university/institution…")}
            value={institution.choice}
            options={institutionOptions}
            onChange={(v) => { institution.setChoice(v); setErrors((er) => ({ ...er, institution: null })); }}
            t={t}
          />
          {errors.institution && <span className="auth-field-error">{errors.institution}</span>}
          {institution.choice === "Other" && (
            <div className={`auth-field${errors.institutionOther ? " has-error" : ""}`} style={{ marginTop: 8 }}>
              <label>{t("education.pleaseSpecify", "Please specify")} <span className="pf-required">*</span></label>
              <input
                ref={institutionOtherRef}
                value={institution.otherText}
                onChange={(e) => { institution.setOtherText(e.target.value); setErrors((er) => ({ ...er, institutionOther: null })); }}
                onBlur={() => onFieldBlur("institutionOther")}
              />
              {errors.institutionOther && <span className="auth-field-error">{errors.institutionOther}</span>}
            </div>
          )}
        </div>

        <div className="auth-field">
          <label>{t("education.fieldOfStudy", "Field of Study")}</label>
          <SearchSelect
            label={t("education.fieldOfStudy", "Field of Study")}
            placeholder={t("education.fieldOfStudyPlaceholder", "Select a field of study…")}
            value={fieldOfStudy.choice}
            options={fieldOptions}
            onChange={(v) => fieldOfStudy.setChoice(v)}
            t={t}
          />
          {fieldOfStudy.choice === "Other" && (
            <input
              value={fieldOfStudy.otherText}
              onChange={(e) => fieldOfStudy.setOtherText(e.target.value)}
              placeholder={t("education.pleaseSpecify", "Please specify")}
              style={{ marginTop: 8 }}
            />
          )}
        </div>

        <div className="profile-field-grid">
          <div className={`auth-field${errors.startYear ? " has-error" : ""}`}>
            <label>{t("education.startYear", "Start Year")} <span className="pf-required">*</span></label>
            <YearSelect
              label={t("education.startYear", "Start Year")}
              placeholder={t("education.startYear", "Start Year")}
              value={form.startYear}
              onChange={(v) => { setForm((f) => ({ ...f, startYear: v })); setErrors((er) => ({ ...er, startYear: null, endYear: null })); }}
            />
            {errors.startYear && <span className="auth-field-error">{errors.startYear}</span>}
          </div>
          <div className={`auth-field${errors.endYear ? " has-error" : ""}`}>
            <label>{t("education.endYear", "End Year")}</label>
            <YearSelect
              label={t("education.endYear", "End Year")}
              placeholder={form.isCurrentlyStudying ? t("education.currentlyStudying", "Currently Studying") : t("education.endYear", "End Year")}
              value={form.isCurrentlyStudying ? "" : form.endYear}
              onChange={(v) => { setForm((f) => ({ ...f, endYear: v })); setErrors((er) => ({ ...er, endYear: null })); }}
              disabled={form.isCurrentlyStudying}
            />
            {errors.endYear && <span className="auth-field-error">{errors.endYear}</span>}
          </div>
        </div>

        <label className="profile-checkbox-field">
          <input
            type="checkbox"
            checked={form.isCurrentlyStudying}
            onChange={(e) => {
              setForm((f) => ({ ...f, isCurrentlyStudying: e.target.checked, endYear: e.target.checked ? "" : f.endYear }));
              if (e.target.checked) setErrors((er) => ({ ...er, endYear: null }));
            }}
          />
          {t("education.currentlyStudying", "Currently Studying")}
        </label>

        <div className="auth-field">
          <label>{t("education.location", "Location")}</label>
          <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder={t("education.locationPlaceholder", "e.g. Lucknow, India")} />
        </div>

        <div className="auth-field">
          <div className="pf-field-label-row">
            <label>{t("education.description", "Description")}</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="pf-char-counter">{form.description.length}/{DESCRIPTION_MAX}</span>
              <button type="button" className="pf-ai-bio-btn" onClick={enhanceWithAi} disabled={enhancing}>
                {enhancing ? <span className="mic-btn-spinner" /> : <Icon name="sparkle" size={13} />}
                {enhancing ? t("education.enhancing", "Enhancing…") : t("education.enhanceWithAi", "Enhance with AI")}
              </button>
            </div>
          </div>
          <div className="pf-bio-wrap">
            <textarea
              rows={3}
              maxLength={DESCRIPTION_MAX}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value.slice(0, DESCRIPTION_MAX) }))}
              placeholder={t("education.descriptionPlaceholder", "Rough notes are fine — AI can help polish this")}
            />
            <MicButton
              onTranscript={(text) => setForm((f) => ({ ...f, description: text.slice(0, DESCRIPTION_MAX) }))}
              className="pf-bio-mic"
            />
          </div>
          {enhanceNote && <span className="wx-enhance-note"><Icon name="check" size={13} /> {enhanceNote}</span>}
          {enhanceError && <span className="auth-field-error">{enhanceError}</span>}
          {errors.description && <span className="auth-field-error">{errors.description}</span>}
        </div>

        <div className="pf-form-actions">
          <button type="submit" className="btn btn-gold" disabled={saving}>{saving ? t("education.saving", "Saving…") : t("education.save", "Save")}</button>
          <button type="button" className="btn btn-outline-ink" onClick={onCancel} disabled={saving}>{t("education.cancel", "Cancel")}</button>
        </div>
      </form>
    </>
  );
}

function DescriptionText({ text, t }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;
  const isLong = text.length > DESCRIPTION_TRUNCATE;
  const shown = expanded || !isLong ? text : `${text.slice(0, DESCRIPTION_TRUNCATE).trimEnd()}…`;
  return (
    <p className="wx-description">
      {shown}
      {isLong && (
        <button type="button" className="wx-expand-toggle" onClick={() => setExpanded((v) => !v)}>
          {expanded ? t("education.showLess", "Show less") : t("education.showMore", "Show more")}
        </button>
      )}
    </p>
  );
}

function EducationCard({ mode = "self", targetUserId, entries: viewEntries }) {
  const editable = mode !== "view";
  const { client, base } = editConfig(mode, targetUserId);
  const { t, language } = useTranslation();

  const [entries, setEntries] = useState(mode === "view" ? viewEntries || [] : []);
  const [loading, setLoading] = useState(mode !== "view");
  const [formTarget, setFormTarget] = useState(null); // null = list view | "new" | entry being edited
  const [deleting, setDeleting] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [autoOpened, setAutoOpened] = useState(false);

  const sortEntries = (list) =>
    [...list].sort((a, b) => (b.endYear || b.startYear || 0) - (a.endYear || a.startYear || 0));

  useEffect(() => {
    if (mode === "view") {
      setEntries(sortEntries(viewEntries || []));
      return;
    }
    setLoading(true);
    client.get(`${base}/education`).then(({ data }) => setEntries(sortEntries(data.education))).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, targetUserId]);

  // First time this card has nothing to show, open the Add form right away
  // instead of making the member click through an empty-state prompt first.
  // Guarded by `autoOpened` so cancelling out of it doesn't just reopen it.
  useEffect(() => {
    if (editable && !loading && entries.length === 0 && !formTarget && !autoOpened) {
      setFormTarget("new");
      setAutoOpened(true);
    }
  }, [editable, loading, entries.length, formTarget, autoOpened]);

  const upsert = (entry, isEdit) => {
    setEntries((es) => sortEntries(isEdit ? es.map((e) => (e.id === entry.id ? entry : e)) : [...es, entry]));
    setFormTarget(null);
  };

  const confirmDelete = async () => {
    setBusyId(deleting.id);
    try {
      await client.delete(`${base}/education/${deleting.id}`);
      setEntries((es) => es.filter((e) => e.id !== deleting.id));
      setDeleting(null);
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = async (entry) => {
    setBusyId(entry.id);
    try {
      const { data } = await client.patch(`${base}/education/${entry.id}`, { isActive: !entry.isActive });
      setEntries((es) => sortEntries(es.map((e) => (e.id === entry.id ? data.education : e))));
    } finally {
      setBusyId(null);
    }
  };

  if (!editable && !loading && entries.length === 0) return null;

  if (formTarget) {
    return (
      <div className="card profile-card">
        <EntryForm
          entry={formTarget === "new" ? null : formTarget}
          client={client}
          base={base}
          mode={mode}
          language={language}
          onCancel={() => setFormTarget(null)}
          onSaved={upsert}
          t={t}
        />
      </div>
    );
  }

  const visibleEntries = editable ? entries : entries.filter((e) => e.isActive !== false);

  return (
    <div className="card profile-card">
      <div className="profile-card-head">
        <h3>{t("education.heading", "Education")}</h3>
        {editable && entries.length > 0 && (
          <button type="button" className="btn btn-outline-ink" onClick={() => setFormTarget("new")}>
            <Icon name="plus" size={14} /> {t("education.addTitle", "Add Education")}
          </button>
        )}
      </div>

      {loading ? (
        <p className="msj-note">{t("education.loading", "Loading…")}</p>
      ) : visibleEntries.length === 0 ? (
        editable && (
          <button type="button" className="profile-empty-prompt" onClick={() => setFormTarget("new")}>
            <Icon name="plus" size={14} /> {t("education.addEmptyPrompt", "Add your education")}
          </button>
        )
      ) : (
        <div className="wx-timeline">
          {visibleEntries.map((e) => (
            <div className={`wx-item${e.isCurrentlyStudying ? " wx-item-current" : ""}${e.isActive === false ? " wx-item-inactive" : ""}`} key={e.id}>
              <div className="wx-rail">
                <span className="wx-dot" />
                <span className="wx-line" />
              </div>
              <div className="wx-card">
                <div className="wx-card-head">
                  <div className="wx-card-icon"><Icon name="book" size={17} /></div>
                  <div className="wx-card-heading">
                    <div className="wx-title-row">
                      <strong>{e.degree}{e.fieldOfStudy ? ` · ${e.fieldOfStudy}` : ""}</strong>
                      {e.isCurrentlyStudying && <span className="wx-current-badge">{t("education.currentlyStudying", "Currently Studying")}</span>}
                      {e.isActive === false && <span className="wx-inactive-badge">{t("education.deactivated", "Deactivated")}</span>}
                    </div>
                    <span className="wx-company-line">{e.institution}{e.level ? ` · ${e.level}` : ""}</span>
                    <span className="wx-meta-line">
                      {e.startYear || "—"} – {e.isCurrentlyStudying ? t("education.present", "Present") : e.endYear || "—"}
                      {e.location ? ` · ${e.location}` : ""}
                    </span>
                  </div>
                  {editable && (
                    <div className="profile-list-item-actions">
                      <button type="button" className="profile-icon-btn" aria-label="Edit" onClick={() => setFormTarget(e)}><Icon name="edit" size={15} /></button>
                      <button
                        type="button"
                        className="profile-icon-btn"
                        aria-label={e.isActive === false ? "Activate" : "Deactivate"}
                        title={e.isActive === false ? t("education.activate", "Activate") : t("education.deactivate", "Deactivate")}
                        disabled={busyId === e.id}
                        onClick={() => toggleActive(e)}
                      >
                        <Icon name={e.isActive === false ? "eye" : "eyeOff"} size={15} />
                      </button>
                      <button type="button" className="profile-icon-btn" aria-label="Delete" onClick={() => setDeleting(e)}><Icon name="trash" size={15} /></button>
                    </div>
                  )}
                </div>

                <DescriptionText text={e.description} t={t} />
              </div>
            </div>
          ))}
        </div>
      )}

      {deleting && (
        <div className="msj-modal-overlay" onClick={() => setDeleting(null)}>
          <div className="msj-modal" onClick={(e) => e.stopPropagation()}>
            <button className="msj-modal-close" onClick={() => setDeleting(null)} aria-label="Close"><Icon name="x" size={16} /></button>
            <h3 style={{ textAlign: "center" }}>{t("education.deleteConfirmPrefix", "Delete")} "{deleting.degree}"?</h3>
            <p className="msj-modal-sub" style={{ textAlign: "center" }}>{t("education.deleteConfirmSub", "This can't be undone.")}</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-outline-ink" style={{ flex: 1 }} onClick={() => setDeleting(null)} disabled={busyId === deleting.id}>{t("education.cancel", "Cancel")}</button>
              <button className="btn btn-gold" style={{ flex: 1 }} onClick={confirmDelete} disabled={busyId === deleting.id}>{busyId === deleting.id ? t("education.pleaseWait", "Please wait…") : t("education.delete", "Delete")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EducationCard;
