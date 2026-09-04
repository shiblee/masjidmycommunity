import fs from "fs";
import Testimonial from "../models/Testimonial.js";

// Multipart form fields all arrive as strings — these coerce them back to
// the model's real types, while still accepting a real boolean/number if a
// future JSON-only caller ever posts one directly.
function toBool(v, fallback) {
  if (v === undefined) return fallback;
  if (typeof v === "boolean") return v;
  return v === "true" || v === "1";
}
function toRating(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > 5) return undefined; // undefined signals "invalid" to the caller
  return n;
}

export const list = async (req, res) => {
  try {
    const testimonials = await Testimonial.findAll({ order: [["sortOrder", "ASC"]] });
    res.json({ testimonials });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { authorName, designation, quote, testimonialDate } = req.body;
    if (!authorName?.trim()) return res.status(400).json({ message: "Author name is required." });
    if (!quote?.trim()) return res.status(400).json({ message: "Testimonial content is required." });

    const rating = toRating(req.body.rating);
    if (rating === undefined) return res.status(400).json({ message: "Rating must be a whole number from 1 to 5." });

    const maxOrder = (await Testimonial.max("sortOrder")) || 0;
    const testimonial = await Testimonial.create({
      authorName: authorName.trim(),
      designation: designation?.trim() || null,
      quote: quote.trim(),
      rating,
      testimonialDate: testimonialDate || null,
      photoUrl: req.file ? `/uploads/testimonial-photos/${req.file.filename}` : null,
      isFeatured: toBool(req.body.isFeatured, false),
      isActive: toBool(req.body.isActive, true),
      sortOrder: maxOrder + 1,
    });
    res.status(201).json({ testimonial });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const testimonial = await Testimonial.findByPk(req.params.id);
    if (!testimonial) return res.status(404).json({ message: "Testimonial not found." });

    if (req.body.authorName !== undefined) {
      if (!req.body.authorName.trim()) return res.status(400).json({ message: "Author name is required." });
      testimonial.authorName = req.body.authorName.trim();
    }
    if (req.body.designation !== undefined) testimonial.designation = req.body.designation.trim() || null;
    if (req.body.quote !== undefined) {
      if (!req.body.quote.trim()) return res.status(400).json({ message: "Testimonial content is required." });
      testimonial.quote = req.body.quote.trim();
    }
    if (req.body.rating !== undefined) {
      const rating = toRating(req.body.rating);
      if (rating === undefined) return res.status(400).json({ message: "Rating must be a whole number from 1 to 5." });
      testimonial.rating = rating;
    }
    if (req.body.testimonialDate !== undefined) testimonial.testimonialDate = req.body.testimonialDate || null;
    if (req.body.isFeatured !== undefined) testimonial.isFeatured = toBool(req.body.isFeatured);
    if (req.body.isActive !== undefined) testimonial.isActive = toBool(req.body.isActive);
    if (req.body.sortOrder !== undefined) testimonial.sortOrder = req.body.sortOrder;

    const previousPhoto = testimonial.photoUrl;
    if (req.file) {
      testimonial.photoUrl = `/uploads/testimonial-photos/${req.file.filename}`;
    } else if (req.body.removePhoto === "true") {
      testimonial.photoUrl = null;
    }

    await testimonial.save();

    if (testimonial.photoUrl !== previousPhoto && previousPhoto) {
      fs.unlink(`.${previousPhoto}`, () => {});
    }

    res.json({ testimonial });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const testimonial = await Testimonial.findByPk(req.params.id);
    if (!testimonial) return res.status(404).json({ message: "Testimonial not found." });
    const photo = testimonial.photoUrl;
    await testimonial.destroy();
    if (photo) fs.unlink(`.${photo}`, () => {});
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
