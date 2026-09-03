import Page from "../models/Page.js";
import PageContent from "../models/PageContent.js";
import Language from "../models/Language.js";

export const getPage = async (req, res) => {
  try {
    const page = await Page.findOne({ where: { slug: req.params.slug, isActive: true } });
    if (!page) return res.status(404).json({ message: "Page not found." });

    const requestedLang = req.query.lang || "en";
    let content = await PageContent.findOne({ where: { pageId: page.id, languageCode: requestedLang } });
    let languageCode = requestedLang;
    if (!content) {
      content = await PageContent.findOne({ where: { pageId: page.id, languageCode: "en" } });
      languageCode = "en";
    }
    if (!content) return res.status(404).json({ message: "This page has no content yet." });

    const language = await Language.findOne({ where: { code: languageCode } });

    res.json({
      slug: page.slug,
      title: content.title,
      bodyHtml: content.bodyHtml,
      updatedAt: content.updatedAt,
      languageCode,
      direction: language?.direction || "ltr",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
