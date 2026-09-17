import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Icon } from "../../components/Icons.jsx";
import { Field } from "../../components/masjid/ContactPersonForm.jsx";
import { WizardShell } from "../../components/wizard/WizardShell.jsx";
import AddressAutocomplete from "../../components/AddressAutocomplete.jsx";
import requirementApi from "../../services/requirementApi.js";
import userApi from "../../services/userApi.js";
import { useTranslation } from "../../i18n/LanguageContext.jsx";

const REMARK_MAX = 1000;

function emptyForm() {
  return {
    categoryId: "", subcategoryId: "", remark: "",
    address: "", formattedAddress: "", latitude: null, longitude: null, placeId: "",
  };
}

// A single flat form, same reasoning as JobForm.jsx -- a Requirement has no
// draft/review lifecycle, it's just submitted. Rendered as its own standalone
// page (WizardShell's non-embedded branch) rather than inline in Community.jsx
// like Job/Masjid/Campaign forms are -- simpler, and nothing about this form
// needs the wall's layout.
function RequirementForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  useEffect(() => {
    userApi.get("/meta/requirement-categories").then(({ data }) => setCategories(data.requirementCategories)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.categoryId) {
      setSubcategories([]);
      return;
    }
    userApi
      .get("/meta/requirement-subcategories", { params: { categoryId: form.categoryId } })
      .then(({ data }) => setSubcategories(data.requirementSubcategories))
      .catch(() => setSubcategories([]));
  }, [form.categoryId]);

  const setField = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: null, form: null }));
  };

  const onCategoryChange = (e) => {
    setForm((f) => ({ ...f, categoryId: e.target.value, subcategoryId: "" }));
    setErrors((er) => ({ ...er, categoryId: null, subcategoryId: null, form: null }));
  };

  const applyResolvedAddress = (fields) => {
    setForm((f) => ({
      ...f,
      address: fields.address || fields.formattedAddress || f.address,
      formattedAddress: fields.formattedAddress || f.formattedAddress,
      latitude: fields.latitude ?? f.latitude,
      longitude: fields.longitude ?? f.longitude,
      placeId: fields.placeId || f.placeId,
    }));
    setErrors((er) => ({ ...er, address: null, form: null }));
  };

  const validate = () => {
    const errs = {};
    if (!form.categoryId) errs.categoryId = t("requirementForm.errors.categoryRequired", "Category is required.");
    if (!form.subcategoryId) errs.subcategoryId = t("requirementForm.errors.subcategoryRequired", "Subcategory is required.");
    if (!form.remark.trim()) errs.remark = t("requirementForm.errors.remarkRequired", "Please describe your requirement.");
    if (!form.address.trim()) errs.address = t("requirementForm.errors.addressRequired", "Address is required.");
    return errs;
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      await requirementApi.post("/", form);
      navigate("/account/my-requirements", { state: { justSubmitted: true } });
    } catch (err) {
      setErrors({ form: err.response?.data?.message || t("requirementForm.errors.saveFailed", "Couldn't submit your requirement. Please try again.") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <WizardShell>
      <Link to="/account/my-requirements" className="msj-back-link"><Icon name="chevronLeft" size={16} /> {t("requirementForm.backToMyRequirements", "Back to My Requirements")}</Link>

      <div className="msj-wizard-center">
        {errors.form && <div className="auth-alert" style={{ marginTop: 16, marginBottom: 20 }}><Icon name="info" size={17} />{errors.form}</div>}

        <form onSubmit={submit} style={{ marginTop: 20 }}>
          <div className="card msj-step-card">
            <div className="msj-field-row">
              <Field label={t("requirementForm.fields.category", "Category")} required error={errors.categoryId}>
                <select value={form.categoryId} onChange={onCategoryChange}>
                  <option value="">{t("requirementForm.fields.selectCategory", "Select a category")}</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label={t("requirementForm.fields.subcategory", "Subcategory")} required error={errors.subcategoryId}>
                <select value={form.subcategoryId} onChange={setField("subcategoryId")} disabled={!form.categoryId}>
                  <option value="">{t("requirementForm.fields.selectSubcategory", "Select a subcategory")}</option>
                  {subcategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
            </div>

            <Field
              label={t("requirementForm.fields.remark", "Remark / Requirement Details")}
              required
              error={errors.remark}
              labelExtra={<span className="pf-char-counter">{form.remark.length}/{REMARK_MAX}</span>}
            >
              <textarea
                rows={5}
                maxLength={REMARK_MAX}
                value={form.remark}
                onChange={setField("remark")}
                placeholder={t("requirementForm.fields.remarkPlaceholder", "Describe what you need help with")}
              />
            </Field>

            <Field label={t("requirementForm.fields.address", "Address")} required error={errors.address}>
              <AddressAutocomplete
                value={form.address}
                onChange={(v) => {
                  setForm((f) => ({ ...f, address: v }));
                  setErrors((er) => ({ ...er, address: null, form: null }));
                }}
                onResolved={applyResolvedAddress}
                placeholder={t("requirementForm.fields.addressPlaceholder", "Search for your address")}
              />
            </Field>

            <div className="msj-prayer-savebar" style={{ marginTop: 8 }}>
              <Link to="/account/my-requirements" className="btn btn-outline-ink">{t("masjidWizard.contacts.cancel", "Cancel")}</Link>
              <button type="submit" className="btn btn-gold" disabled={saving}>
                {saving ? t("masjidWizard.actions.saving", "Saving…") : t("requirementForm.actions.submit", "Submit")} <span className="btn-arrow">→</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </WizardShell>
  );
}

export default RequirementForm;
