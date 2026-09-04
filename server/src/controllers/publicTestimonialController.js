import { Op } from "sequelize";
import Testimonial from "../models/Testimonial.js";
import Translation from "../models/Translation.js";

export const list = async (req, res) => {
  try {
    const { lang = "en", featured } = req.query;
    const where = { isActive: true };
    if (featured === "true") where.isFeatured = true;

    const testimonials = await Testimonial.findAll({ where, order: [["sortOrder", "ASC"]] });

    let overrides = {};
    if (lang !== "en" && testimonials.length > 0) {
      const rows = await Translation.findAll({
        where: {
          category: "testimonial",
          languageCode: lang,
          key: {
            [Op.in]: testimonials.flatMap((t) => [`testimonial.quote.${t.id}`, `testimonial.designation.${t.id}`]),
          },
        },
      });
      overrides = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    }

    res.json({
      testimonials: testimonials.map((t) => ({
        id: t.id,
        authorName: t.authorName,
        designation: overrides[`testimonial.designation.${t.id}`] || t.designation,
        photoUrl: t.photoUrl,
        quote: overrides[`testimonial.quote.${t.id}`] || t.quote,
        rating: t.rating,
        testimonialDate: t.testimonialDate,
        isFeatured: t.isFeatured,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
