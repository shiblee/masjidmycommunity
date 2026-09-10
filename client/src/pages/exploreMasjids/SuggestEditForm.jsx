import React, { useEffect, useState } from "react";
import axios from "axios";
import { Icon } from "../../components/Icons.jsx";
import MediaThumb from "../../components/MediaThumb.jsx";
import { API_BASE, API_ORIGIN } from "../../config.js";
import { getUserToken } from "../../utils/userAuthStorage.js";
import { IMAGE_SIZE_MAX_BYTES } from "./exploreMasjidsShared.jsx";
import { formatPrayerTime } from "../../utils/formatPrayerTime.js";

const API = `${API_BASE}/masjids/public`;

const CORRECTION_FIELDS = [
  { key: "name", label: "Name" },
  { key: "category", label: "Category" },
  { key: "location", label: "Location" },
  { key: "photos", label: "Photos" },
  { key: "contact", label: "Contact Details" },
  { key: "prayer_times", label: "Prayer Timings" },
  { key: "other", label: "Other" },
];
const CORRECTION_TEXT_MAX = 1000;
const CORRECTION_PHOTO_MAX = 5;

function emptyValueFor(fieldKey) {
  if (fieldKey === "contact") return { designation: "", name: "", mobile: "" };
  if (fieldKey === "photos") return { files: [], caption: "" };
  return { text: "" };
}

function CorrectionCard({ fieldKey, label, masjid, categories, designations, prayerRoster, value, onChange, onRemove }) {
  const set = (patch) => onChange({ ...value, ...patch });

  const addPhotos = (fileList) => {
    const files = Array.from(fileList || []).slice(0, CORRECTION_PHOTO_MAX - value.files.length);
    const accepted = [];
    for (const file of files) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) continue;
      if (file.size > IMAGE_SIZE_MAX_BYTES) continue;
      accepted.push({ file, previewUrl: URL.createObjectURL(file) });
    }
    if (accepted.length) set({ files: [...value.files, ...accepted] });
  };

  const removePhoto = (i) => {
    URL.revokeObjectURL(value.files[i].previewUrl);
    set({ files: value.files.filter((_, idx) => idx !== i) });
  };

  let current;
  let suggestedInput;

  if (fieldKey === "name") {
    current = masjid.name || "Not set";
    suggestedInput = <input type="text" value={value.text} onChange={(e) => set({ text: e.target.value })} placeholder="Suggested name" maxLength={CORRECTION_TEXT_MAX} />;
  } else if (fieldKey === "category") {
    current = masjid.category || "Not set";
    suggestedInput = (
      <select value={value.text} onChange={(e) => set({ text: e.target.value })}>
        <option value="">Suggested category…</option>
        {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
      </select>
    );
  } else if (fieldKey === "location") {
    current = masjid.formattedAddress || masjid.address || "Not set";
    suggestedInput = <textarea rows={2} value={value.text} onChange={(e) => set({ text: e.target.value })} placeholder="Suggested location / landmark" maxLength={CORRECTION_TEXT_MAX} />;
  } else if (fieldKey === "contact") {
    current = masjid.imamName ? `Imam: ${masjid.imamName}` : "No contact on file";
    suggestedInput = (
      <div className="msj-correction-contact-inputs">
        <select value={value.designation} onChange={(e) => set({ designation: e.target.value })}>
          <option value="">Designation…</option>
          {designations.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
        </select>
        <input type="text" value={value.name} onChange={(e) => set({ name: e.target.value })} placeholder="Name" />
        <input type="tel" value={value.mobile} onChange={(e) => set({ mobile: e.target.value })} placeholder="Mobile number" />
      </div>
    );
  } else if (fieldKey === "photos") {
    current = masjid.coverPhotoUrl ? <MediaThumb src={`${API_ORIGIN}${masjid.coverPhotoUrl}`} className="msj-correction-current-photo" /> : "No photo yet";
    suggestedInput = (
      <div>
        <label className="msj-review-dropzone msj-correction-photo-dropzone">
          <Icon name="upload" size={16} />
          <span>Attach a photo</span>
          <input type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
        </label>
        {value.files.length > 0 && (
          <div className="msj-review-media-grid">
            {value.files.map((f, i) => (
              <div className="msj-review-media-thumb" key={i}>
                <MediaThumb src={f.previewUrl} />
                <button type="button" className="msj-review-media-remove" onClick={() => removePhoto(i)} aria-label="Remove"><Icon name="x" size={12} /></button>
              </div>
            ))}
          </div>
        )}
        <input type="text" value={value.caption} onChange={(e) => set({ caption: e.target.value })} placeholder="Caption (optional)" maxLength={CORRECTION_TEXT_MAX} style={{ marginTop: 10 }} />
      </div>
    );
  } else if (fieldKey === "prayer_times") {
    current = prayerRoster.length > 0 ? prayerRoster.map((p) => `${p.name}: ${formatPrayerTime(p.time)}`).join(" · ") : "Not set";
    suggestedInput = (
      <textarea
        rows={3}
        value={value.text}
        onChange={(e) => set({ text: e.target.value })}
        placeholder="Suggested prayer timings, e.g. Fajr 5:15 AM, Zuhr 1:30 PM, Asr 5:00 PM, Maghrib 6:45 PM, Isha 8:15 PM"
        maxLength={CORRECTION_TEXT_MAX}
      />
    );
  } else {
    current = null;
    suggestedInput = <textarea rows={3} value={value.text} onChange={(e) => set({ text: e.target.value })} placeholder="Describe the correction…" maxLength={CORRECTION_TEXT_MAX} />;
  }

  return (
    <div className="msj-correction-card">
      <div className="msj-correction-card-head">
        <strong>{label}</strong>
        <button type="button" className="msj-correction-remove" onClick={onRemove} aria-label={`Remove ${label}`}><Icon name="x" size={13} /></button>
      </div>
      {current !== null && (
        <div className="msj-correction-current">
          <span className="msj-correction-label">Current</span>
          {typeof current === "string" ? <span>{current}</span> : current}
        </div>
      )}
      <div className="msj-correction-suggested">
        <span className="msj-correction-label">Suggested</span>
        {suggestedInput}
      </div>
    </div>
  );
}

function SuggestEditForm({ masjid, onDone, onCancel }) {
  const masjidId = masjid.id;
  const [selected, setSelected] = useState([]);
  const [values, setValues] = useState({});
  const [categories, setCategories] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [prayerRoster, setPrayerRoster] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    axios.get(`${API}/categories`).then(({ data }) => setCategories(data.categories)).catch(() => {});
    axios.get(`${API}/contact-designations`).then(({ data }) => setDesignations(data.designations)).catch(() => {});
    axios.get(`${API}/${masjidId}/prayer-times`).then(({ data }) => setPrayerRoster(data.roster || [])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleField = (key) => {
    setSelected((s) => {
      if (s.includes(key)) return s.filter((k) => k !== key);
      return [...s, key];
    });
    setValues((v) => (v[key] ? v : { ...v, [key]: emptyValueFor(key) }));
  };

  const removeField = (key) => setSelected((s) => s.filter((k) => k !== key));

  const submit = async () => {
    if (selected.length === 0) { setError("Please select at least one field to correct."); return; }

    const payload = [];
    const photoFiles = [];
    for (const key of selected) {
      const v = values[key] || emptyValueFor(key);
      if (key === "contact") {
        if (!v.designation || !v.name.trim() || !v.mobile.trim()) { setError("Please fill in designation, name, and mobile number for the contact suggestion."); return; }
        payload.push({ fieldKey: key, suggestedValue: { designation: v.designation, name: v.name.trim(), mobile: v.mobile.trim() } });
      } else if (key === "photos") {
        if (v.files.length === 0) { setError("Please attach at least one photo."); return; }
        v.files.forEach((f) => photoFiles.push(f.file));
        payload.push({ fieldKey: key, suggestedValue: { caption: v.caption.trim() } });
      } else {
        if (!v.text.trim()) { setError(`Please enter a suggested value for ${CORRECTION_FIELDS.find((f) => f.key === key).label}.`); return; }
        payload.push({ fieldKey: key, suggestedValue: { text: v.text.trim() } });
      }
    }

    setBusy(true);
    setError("");
    try {
      const token = getUserToken();
      const fd = new FormData();
      fd.append("fields", JSON.stringify(payload));
      photoFiles.forEach((f) => fd.append("photos", f));
      await axios.post(`${API}/${masjidId}/suggest-edit`, fd, { headers: { Authorization: `Bearer ${token}` } });
      onDone();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't send your suggestion. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="msj-suggest-edit-form">
      <p className="msj-correction-intro">Select what needs to be corrected — you can pick more than one.</p>
      <div className="msj-correction-checklist">
        {CORRECTION_FIELDS.map((f) => (
          <label key={f.key} className="msj-correction-checkbox">
            <input type="checkbox" checked={selected.includes(f.key)} onChange={() => toggleField(f.key)} />
            {f.label}
          </label>
        ))}
      </div>

      {selected.map((key) => {
        const def = CORRECTION_FIELDS.find((f) => f.key === key);
        return (
          <CorrectionCard
            key={key}
            fieldKey={key}
            label={def.label}
            masjid={masjid}
            categories={categories}
            designations={designations}
            prayerRoster={prayerRoster}
            value={values[key] || emptyValueFor(key)}
            onChange={(next) => setValues((v) => ({ ...v, [key]: next }))}
            onRemove={() => removeField(key)}
          />
        );
      })}

      {error && <p className="msj-review-form-error">{error}</p>}
      <div className="msj-review-form-actions">
        <button type="button" className="btn btn-outline-ink" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="button" className="btn btn-gold" onClick={submit} disabled={busy}>{busy ? "Sending…" : "Submit"}</button>
      </div>
    </div>
  );
}

export default SuggestEditForm;
