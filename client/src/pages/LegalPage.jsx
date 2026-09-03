import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../config.js";
import { useTranslation } from "../i18n/LanguageContext.jsx";
import LegalDocument from "../components/LegalDocument.jsx";
import CookiePreferences from "../components/CookiePreferences.jsx";

// Slugs that need a live widget mounted inside their content, keyed by the
// element id the admin-authored HTML contains a matching <div id="..."> for.
const EXTRA_MOUNTS_BY_SLUG = {
  "cookie-policy": { "cookie-prefs-mount": <CookiePreferences /> },
};

function LegalPage({ slug: slugProp }) {
  const params = useParams();
  const slug = slugProp || params.slug;
  const { language } = useTranslation();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    axios
      .get(`${API_BASE}/pages/${slug}`, { params: { lang: language } })
      .then(({ data }) => setPage(data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug, language]);

  const extraMounts = useMemo(() => EXTRA_MOUNTS_BY_SLUG[slug], [slug]);

  if (loading) {
    return <main className="wrap legal-page" />;
  }

  if (notFound || !page) {
    return (
      <main className="wrap legal-page">
        <div className="legal-head">
          <h1>Page not found</h1>
        </div>
      </main>
    );
  }

  return <LegalDocument title={page.title} bodyHtml={page.bodyHtml} updatedAt={page.updatedAt} extraMounts={extraMounts} />;
}

export default LegalPage;
