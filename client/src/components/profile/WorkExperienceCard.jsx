import React, { useEffect, useRef, useState } from "react";
import { Icon } from "../Icons.jsx";
import userApi from "../../services/userApi.js";
import adminApi from "../../admin/services/adminApi.js";
import { useTranslation } from "../../i18n/LanguageContext.jsx";

const MAX_ACHIEVEMENTS = 8;
const MAX_SKILLS = 12;
const DESCRIPTION_TRUNCATE = 220;

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

function SearchSelect({ label, placeholder, value, options, onChange, t, autoFocus }) {
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
        autoFocus={autoFocus}
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
              placeholder={t("workExperience.searchPlaceholder", "Search…")}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          </li>
          {filtered.length === 0 && <li className="pf-search-select-empty">{t("workExperience.noMatches", "No matches")}</li>}
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

const DATE_LOCALE = { en: "en-US", hi: "hi-IN", ur: "ur-PK", ar: "ar-SA" };

function monthYear(dateStr, language) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString(DATE_LOCALE[language] || "en-US", { month: "short", year: "numeric" });
}

// "2 yrs 3 mos" style duration between start and (end or today).
function formatDuration(startDate, endDate, isCurrent, t) {
  if (!startDate) return "";
  const start = new Date(startDate);
  const end = isCurrent || !endDate ? new Date() : new Date(endDate);
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (months < 0) months = 0;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  const parts = [];
  if (years) parts.push(`${years} ${years === 1 ? t("workExperience.year", "yr") : t("workExperience.years", "yrs")}`);
  if (remMonths || !years) parts.push(`${remMonths} ${remMonths === 1 ? t("workExperience.month", "mo") : t("workExperience.months", "mos")}`);
  return parts.join(" ");
}

// Current roles first (most recently started among currents), then past
// roles by how recently they ended — this is what "most recent/current
// first" means once more than one role can be "current" simultaneously.
function sortEntries(list) {
  return [...list].sort((a, b) => {
    if (!!a.isCurrent !== !!b.isCurrent) return a.isCurrent ? -1 : 1;
    const aEnd = a.isCurrent ? Date.now() : new Date(a.endDate || a.startDate).getTime();
    const bEnd = b.isCurrent ? Date.now() : new Date(b.endDate || b.startDate).getTime();
    return bEnd - aEnd;
  });
}

function ChipInput({ value, onChange, placeholder, max }) {
  const [draft, setDraft] = useState("");

  const commit = () => {
    const v = draft.trim();
    if (!v || value.includes(v) || value.length >= max) {
      setDraft("");
      return;
    }
    onChange([...value, v]);
    setDraft("");
  };

  return (
    <div className="wx-chip-input">
      {value.map((chip, i) => (
        <span key={chip + i} className="wx-chip">
          {chip}
          <button type="button" aria-label="Remove" onClick={() => onChange(value.filter((_, idx) => idx !== i))}>
            <Icon name="x" size={11} />
          </button>
        </span>
      ))}
      {value.length < max && (
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit();
            } else if (e.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={commit}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

function AchievementsInput({ value, onChange, max, t }) {
  return (
    <div className="wx-achievements-input">
      {value.map((line, i) => (
        <div className="wx-achievement-row" key={i}>
          <input
            value={line}
            onChange={(e) => onChange(value.map((v, idx) => (idx === i ? e.target.value : v)))}
            placeholder={t("workExperience.achievementPlaceholder", "e.g. Led a redesign that improved sign-ups by 20%")}
          />
          <button type="button" className="profile-icon-btn" aria-label="Remove" onClick={() => onChange(value.filter((_, idx) => idx !== i))}>
            <Icon name="x" size={14} />
          </button>
        </div>
      ))}
      {value.length < max && (
        <button type="button" className="wx-add-line-btn" onClick={() => onChange([...value, ""])}>
          <Icon name="plus" size={13} /> {t("workExperience.addAchievement", "Add achievement")}
        </button>
      )}
    </div>
  );
}

// Chrome-free form — rendered directly inside the card's own content area
// (swapped in place of the timeline) instead of a popup, matching the same
// full-page pattern already used by Profile Details / Security.
function EntryForm({ entry, client, base, mode, language, onCancel, onSaved, t }) {
  const isEdit = !!entry;

  const [companyOptions, setCompanyOptions] = useState([]);
  const [employmentTypeOptions, setEmploymentTypeOptions] = useState([]);

  useEffect(() => {
    const load = (path, setter, key, { alphabetical } = {}) => {
      client.get(metaPath(mode, path)).then(({ data }) => {
        const rows = data[key] || [];
        let names = rows.filter((r) => r.isActive).map((r) => r.name);
        if (alphabetical) {
          // "Other" stays last regardless of alphabetical order, matching
          // the catch-all placement used throughout the rest of the app.
          names = names.slice().sort((a, b) => {
            if (a === "Other") return 1;
            if (b === "Other") return -1;
            return a.localeCompare(b);
          });
        }
        setter(names);
      }).catch(() => {});
    };
    load("companies", setCompanyOptions, "companies", { alphabetical: true });
    load("employment-types", setEmploymentTypeOptions, "employmentTypes");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const company = useOtherField(entry?.company, companyOptions);
  const employmentType = useOtherField(entry?.employmentType, employmentTypeOptions);

  const [form, setForm] = useState({
    title: entry?.title || "",
    startDate: entry?.startDate || "",
    endDate: entry?.endDate || "",
    isCurrent: entry?.isCurrent || false,
    location: entry?.location || "",
    description: entry?.description || "",
    achievements: entry?.achievements?.length ? entry.achievements : [],
    skillsUsed: entry?.skillsUsed || [],
  });
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [enhanceError, setEnhanceError] = useState("");
  const [enhanceNote, setEnhanceNote] = useState("");

  const companyRef = useRef(null);
  const companyOtherRef = useRef(null);
  const titleRef = useRef(null);
  const employmentTypeOtherRef = useRef(null);
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);
  const fieldRefs = {
    company: companyRef, companyOther: companyOtherRef, title: titleRef,
    employmentTypeOther: employmentTypeOtherRef, startDate: startDateRef, endDate: endDateRef,
  };

  const buildErrors = () => {
    const nextErrors = {};
    if (!company.finalValue) nextErrors.company = t("workExperience.companyRequiredError", "Company or organization is required.");
    if (company.choice === "Other" && !company.otherText.trim()) nextErrors.companyOther = t("workExperience.otherRequiredError", "Please specify.");
    if (!form.title.trim()) nextErrors.title = t("workExperience.titleRequiredError", "Job title is required.");
    if (employmentType.choice === "Other" && !employmentType.otherText.trim()) nextErrors.employmentTypeOther = t("workExperience.otherRequiredError", "Please specify.");
    if (!form.startDate) nextErrors.startDate = t("workExperience.startDateRequiredError", "Start date is required.");
    if (!form.isCurrent && form.endDate && form.startDate && form.endDate < form.startDate) {
      nextErrors.endDate = t("workExperience.dateOrderError", "End date can't be before the start date.");
    }
    return nextErrors;
  };

  const onFieldBlur = (field) => {
    const nextErrors = buildErrors();
    setErrors((er) => ({ ...er, [field]: nextErrors[field] || null }));
  };

  const enhanceWithAi = async () => {
    setEnhancing(true);
    setEnhanceError("");
    setEnhanceNote("");
    try {
      const { data } = await client.post(`${base}/work-experience/enhance`, {
        title: form.title,
        company: company.finalValue,
        notes: form.description,
        languageCode: language,
      });
      setForm((f) => {
        const mergedAchievements = [...f.achievements.filter(Boolean)];
        for (const a of data.achievements || []) {
          if (!mergedAchievements.includes(a) && mergedAchievements.length < MAX_ACHIEVEMENTS) mergedAchievements.push(a);
        }
        const mergedSkills = [...f.skillsUsed];
        for (const s of data.skills || []) {
          if (!mergedSkills.includes(s) && mergedSkills.length < MAX_SKILLS) mergedSkills.push(s);
        }
        return { ...f, description: data.description || f.description, achievements: mergedAchievements, skillsUsed: mergedSkills };
      });
      setEnhanceNote(t("workExperience.enhanceApplied", "AI suggestions applied — review and edit before saving."));
    } catch (err) {
      setEnhanceError(err.response?.data?.message || t("workExperience.enhanceError", "Couldn't enhance this entry right now."));
    } finally {
      setEnhancing(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const fieldOrder = ["company", "companyOther", "title", "employmentTypeOther", "startDate", "endDate"];
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
        ...form,
        company: company.finalValue,
        employmentType: employmentType.finalValue || null,
        endDate: form.isCurrent ? null : form.endDate || null,
        achievements: form.achievements.filter((a) => a.trim()),
      };
      const { data } = isEdit
        ? await client.patch(`${base}/work-experience/${entry.id}`, payload)
        : await client.post(`${base}/work-experience`, payload);
      onSaved(data.workExperience, isEdit);
    } catch (err) {
      setError(err.response?.data?.message || t("workExperience.saveError", "Couldn't save this entry."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button type="button" className="profile-form-back" onClick={onCancel}>
        <Icon name="chevronLeft" size={15} /> {t("workExperience.backToList", "Back to Work Experience")}
      </button>
      <h3 className="profile-form-title">{isEdit ? t("workExperience.editTitle", "Edit Work Experience") : t("workExperience.addTitle", "Add Work Experience")}</h3>
      <form onSubmit={submit} noValidate>
        {error && <div className="auth-alert" style={{ marginBottom: 16 }}><Icon name="bulb" size={17} />{error}</div>}

          <div className={`auth-field${errors.company ? " has-error" : ""}`}>
            <label>{t("workExperience.company", "Company / Organization")} <span className="pf-required">*</span></label>
            <SearchSelect
              label={t("workExperience.company", "Company / Organization")}
              placeholder={t("workExperience.companyPlaceholder", "Select a company…")}
              value={company.choice}
              options={companyOptions}
              onChange={(v) => { company.setChoice(v); setErrors((er) => ({ ...er, company: null })); }}
              t={t}
              autoFocus
            />
            {errors.company && <span className="auth-field-error">{errors.company}</span>}
            {company.choice === "Other" && (
              <div className={`auth-field${errors.companyOther ? " has-error" : ""}`} style={{ marginTop: 8 }}>
                <label>{t("workExperience.pleaseSpecify", "Please specify")} <span className="pf-required">*</span></label>
                <input
                  ref={companyOtherRef}
                  value={company.otherText}
                  onChange={(e) => { company.setOtherText(e.target.value); setErrors((er) => ({ ...er, companyOther: null })); }}
                  onBlur={() => onFieldBlur("companyOther")}
                />
                {errors.companyOther && <span className="auth-field-error">{errors.companyOther}</span>}
              </div>
            )}
          </div>
          <div className={`auth-field${errors.title ? " has-error" : ""}`}>
            <label>{t("workExperience.title", "Job Title / Position")} <span className="pf-required">*</span></label>
            <input
              ref={titleRef}
              value={form.title}
              onChange={(e) => { setForm((f) => ({ ...f, title: e.target.value })); setErrors((er) => ({ ...er, title: null })); }}
              onBlur={() => onFieldBlur("title")}
            />
            {errors.title && <span className="auth-field-error">{errors.title}</span>}
          </div>
          <div className="auth-field">
            <label>{t("workExperience.employmentType", "Employment Type")}</label>
            <select value={employmentType.choice} onChange={(e) => employmentType.setChoice(e.target.value)}>
              <option value="">{t("workExperience.type.select", "Select")}</option>
              {employmentTypeOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            {employmentType.choice === "Other" && (
              <div className={`auth-field${errors.employmentTypeOther ? " has-error" : ""}`} style={{ marginTop: 8 }}>
                <label>{t("workExperience.pleaseSpecify", "Please specify")} <span className="pf-required">*</span></label>
                <input
                  ref={employmentTypeOtherRef}
                  value={employmentType.otherText}
                  onChange={(e) => { employmentType.setOtherText(e.target.value); setErrors((er) => ({ ...er, employmentTypeOther: null })); }}
                  onBlur={() => onFieldBlur("employmentTypeOther")}
                />
                {errors.employmentTypeOther && <span className="auth-field-error">{errors.employmentTypeOther}</span>}
              </div>
            )}
          </div>

          <div className="profile-field-grid">
            <div className={`auth-field${errors.startDate ? " has-error" : ""}`}>
              <label>{t("workExperience.startDate", "Start Date")} <span className="pf-required">*</span></label>
              <input
                ref={startDateRef}
                type="month"
                value={form.startDate?.slice(0, 7) || ""}
                onChange={(e) => { setForm((f) => ({ ...f, startDate: `${e.target.value}-01` })); setErrors((er) => ({ ...er, startDate: null, endDate: null })); }}
                onBlur={() => onFieldBlur("startDate")}
              />
              {errors.startDate && <span className="auth-field-error">{errors.startDate}</span>}
            </div>
            <div className={`auth-field${errors.endDate ? " has-error" : ""}`}>
              <label>{t("workExperience.endDate", "End Date")}</label>
              <input
                ref={endDateRef}
                type="month"
                disabled={form.isCurrent}
                value={form.endDate?.slice(0, 7) || ""}
                onChange={(e) => { setForm((f) => ({ ...f, endDate: `${e.target.value}-01` })); setErrors((er) => ({ ...er, endDate: null })); }}
                onBlur={() => onFieldBlur("endDate")}
              />
              {errors.endDate && <span className="auth-field-error">{errors.endDate}</span>}
            </div>
          </div>

          <label className="profile-checkbox-field">
            <input
              type="checkbox"
              checked={form.isCurrent}
              onChange={(e) => {
                setForm((f) => ({ ...f, isCurrent: e.target.checked, endDate: e.target.checked ? "" : f.endDate }));
                if (e.target.checked) setErrors((er) => ({ ...er, endDate: null }));
              }}
            />
            {t("workExperience.currentlyWork", "I currently work here")}
          </label>

          <div className="auth-field">
            <label>{t("workExperience.location", "Location")}</label>
            <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder={t("workExperience.locationPlaceholder", "e.g. Lucknow, India")} />
          </div>

          <div className="auth-field">
            <div className="pf-field-label-row">
              <label>{t("workExperience.description", "Description / Responsibilities")}</label>
              <button type="button" className="pf-ai-bio-btn" onClick={enhanceWithAi} disabled={enhancing}>
                {enhancing ? <span className="mic-btn-spinner" /> : <Icon name="sparkle" size={13} />}
                {enhancing ? t("workExperience.enhancing", "Enhancing…") : t("workExperience.enhanceWithAi", "Enhance with AI")}
              </button>
            </div>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder={t("workExperience.descriptionPlaceholder", "Rough notes are fine — AI can help polish this")}
            />
            {enhanceNote && <span className="wx-enhance-note"><Icon name="check" size={13} /> {enhanceNote}</span>}
            {enhanceError && <span className="auth-field-error">{enhanceError}</span>}
          </div>

          <div className="auth-field">
            <label>{t("workExperience.achievements", "Key Achievements")}</label>
            <AchievementsInput value={form.achievements} onChange={(v) => setForm((f) => ({ ...f, achievements: v }))} max={MAX_ACHIEVEMENTS} t={t} />
          </div>

          <div className="auth-field">
            <label>{t("workExperience.skillsUsed", "Skills / Technologies Used")}</label>
            <ChipInput
              value={form.skillsUsed}
              onChange={(v) => setForm((f) => ({ ...f, skillsUsed: v }))}
              placeholder={t("workExperience.skillsPlaceholder", "Type a skill and press Enter…")}
              max={MAX_SKILLS}
            />
          </div>

        <div className="pf-form-actions">
          <button type="submit" className="btn btn-gold" disabled={saving}>{saving ? t("workExperience.saving", "Saving…") : t("workExperience.save", "Save")}</button>
          <button type="button" className="btn btn-outline-ink" onClick={onCancel} disabled={saving}>{t("workExperience.cancel", "Cancel")}</button>
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
          {expanded ? t("workExperience.showLess", "Show less") : t("workExperience.showMore", "Show more")}
        </button>
      )}
    </p>
  );
}

// mode: "self" (owner editing their own profile), "admin" (admin editing on
// a user's behalf), or "view" (read-only — a visitor, or the profile owner's
// public-facing display where entries arrive pre-fetched via props).
function WorkExperienceCard({ mode = "self", targetUserId, entries: viewEntries }) {
  const editable = mode !== "view";
  const { client, base } = editConfig(mode, targetUserId);
  const { t, language } = useTranslation();

  const [entries, setEntries] = useState(mode === "view" ? sortEntries(viewEntries || []) : []);
  const [loading, setLoading] = useState(mode !== "view");
  const [formTarget, setFormTarget] = useState(null); // null = list view | "new" | entry being edited
  const [deleting, setDeleting] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [autoOpened, setAutoOpened] = useState(false);

  useEffect(() => {
    if (mode === "view") {
      setEntries(sortEntries(viewEntries || []));
      return;
    }
    setLoading(true);
    client.get(`${base}/work-experience`).then(({ data }) => setEntries(sortEntries(data.workExperience))).finally(() => setLoading(false));
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
      await client.delete(`${base}/work-experience/${deleting.id}`);
      setEntries((es) => es.filter((e) => e.id !== deleting.id));
      setDeleting(null);
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = async (entry) => {
    setBusyId(entry.id);
    try {
      const { data } = await client.patch(`${base}/work-experience/${entry.id}`, { isActive: !entry.isActive });
      setEntries((es) => sortEntries(es.map((e) => (e.id === entry.id ? data.workExperience : e))));
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
        <h3>{t("workExperience.heading", "Work Experience")}</h3>
        {editable && entries.length > 0 && (
          <button type="button" className="btn btn-outline-ink" onClick={() => setFormTarget("new")}>
            <Icon name="plus" size={14} /> {t("workExperience.addTitle", "Add Work Experience")}
          </button>
        )}
      </div>

      {loading ? (
        <p className="msj-note">{t("workExperience.loading", "Loading…")}</p>
      ) : visibleEntries.length === 0 ? (
        editable && (
          <button type="button" className="profile-empty-prompt" onClick={() => setFormTarget("new")}>
            <Icon name="plus" size={14} /> {t("workExperience.addEmptyPrompt", "Add your work experience")}
          </button>
        )
      ) : (
        <div className="wx-timeline">
          {visibleEntries.map((e) => (
            <div className={`wx-item${e.isCurrent ? " wx-item-current" : ""}${e.isActive === false ? " wx-item-inactive" : ""}`} key={e.id}>
              <div className="wx-rail">
                <span className="wx-dot" />
                <span className="wx-line" />
              </div>
              <div className="wx-card">
                <div className="wx-card-head">
                  <div className="wx-card-icon"><Icon name="building" size={17} /></div>
                  <div className="wx-card-heading">
                    <div className="wx-title-row">
                      <strong>{e.title}</strong>
                      {e.isCurrent && <span className="wx-current-badge">{t("workExperience.current", "Current")}</span>}
                      {e.isActive === false && <span className="wx-inactive-badge">{t("workExperience.deactivated", "Deactivated")}</span>}
                    </div>
                    <span className="wx-company-line">
                      {e.company}
                      {e.employmentType ? ` · ${e.employmentType}` : ""}
                    </span>
                    <span className="wx-meta-line">
                      {monthYear(e.startDate, language)} – {e.isCurrent ? t("workExperience.present", "Present") : monthYear(e.endDate, language) || "—"}
                      {" · "}{formatDuration(e.startDate, e.endDate, e.isCurrent, t)}
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
                        title={e.isActive === false ? t("workExperience.activate", "Activate") : t("workExperience.deactivate", "Deactivate")}
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

                {e.achievements?.length > 0 && (
                  <ul className="wx-achievements-list">
                    {e.achievements.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                )}

                {e.skillsUsed?.length > 0 && (
                  <div className="wx-skill-chips">
                    {e.skillsUsed.map((s, i) => <span className="wx-skill-chip" key={i}>{s}</span>)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {deleting && (
        <div className="msj-modal-overlay" onClick={() => setDeleting(null)}>
          <div className="msj-modal" onClick={(e) => e.stopPropagation()}>
            <button className="msj-modal-close" onClick={() => setDeleting(null)} aria-label="Close"><Icon name="x" size={16} /></button>
            <h3 style={{ textAlign: "center" }}>{t("workExperience.deleteConfirmPrefix", "Delete")} "{deleting.title}"?</h3>
            <p className="msj-modal-sub" style={{ textAlign: "center" }}>{t("workExperience.deleteConfirmSub", "This can't be undone.")}</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-outline-ink" style={{ flex: 1 }} onClick={() => setDeleting(null)} disabled={busyId === deleting.id}>{t("workExperience.cancel", "Cancel")}</button>
              <button className="btn btn-gold" style={{ flex: 1 }} onClick={confirmDelete} disabled={busyId === deleting.id}>{busyId === deleting.id ? t("workExperience.pleaseWait", "Please wait…") : t("workExperience.delete", "Delete")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkExperienceCard;
