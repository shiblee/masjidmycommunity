// Single source of truth for Meta entity display labels, keyed the same way
// as entityType is stored on MetaChangeLog rows and as the `key` used in
// Meta.jsx's META_ENTITIES / the /admin/meta/:entityKey route param — shared
// by Meta.jsx (building its sidebar) and MetaChangeLogPanel.jsx (labeling
// and filtering log rows) so the two never drift apart.
export const META_ENTITY_LABELS = {
  "masjid-category": "Masjid Category",
  "campaign-category": "Campaign Category",
  "campaign-classification": "Fundraising Classification",
  "concern-type": "Type of Concern",
  "contact-topic": "Contact Topics",
  bank: "Banks",
  "deletion-reason": "Masjid Deletion Reasons",
  "report-reason": "Report Post Reasons",
  skill: "Skills",
  hobby: "Hobbies",
  language: "Languages",
  "marital-status": "Marital Status",
  "education-level": "Education Level",
  degree: "Degree / Qualification",
  institution: "University / Institution",
  "field-of-study": "Field of Study",
  company: "Company / Organization",
  "employment-type": "Employment Type",
};
