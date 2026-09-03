import { Op } from "sequelize";
import Faq from "../models/Faq.js";
import Translation from "../models/Translation.js";
import AiQueryLog from "../models/AiQueryLog.js";
import { FAQ_CATEGORIES } from "../constants/faqCategories.js";
import { retrieve, pickIslamicReference } from "../services/knowledgeRetrievalService.js";
import { generateGroundedAnswer, aiProviderConfigured } from "../services/aiProviderService.js";

export const list = async (req, res) => {
  try {
    const { lang = "en", category, featured } = req.query;
    const where = { isActive: true };
    if (category) where.category = category;
    if (featured === "true") where.isFeatured = true;

    const faqs = await Faq.findAll({ where, order: [["sortOrder", "ASC"]] });

    let overrides = {};
    if (lang !== "en" && faqs.length > 0) {
      const rows = await Translation.findAll({
        where: {
          category: "faq",
          languageCode: lang,
          key: {
            [Op.in]: faqs.flatMap((f) => [`faq.question.${f.id}`, `faq.answer.${f.id}`]),
          },
        },
      });
      overrides = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    }

    res.json({
      faqs: faqs.map((f) => ({
        id: f.id,
        category: f.category,
        question: overrides[`faq.question.${f.id}`] || f.question,
        answer: overrides[`faq.answer.${f.id}`] || f.answer,
        icon: f.icon,
        isFeatured: f.isFeatured,
      })),
      categories: FAQ_CATEGORIES,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const ask = async (req, res) => {
  try {
    const { question, languageCode = "en", history, sessionId } = req.body;
    if (!question?.trim()) return res.status(400).json({ message: "Please enter a question." });
    if (question.length > 500) return res.status(400).json({ message: "Please keep your question under 500 characters." });

    const retrieval = await retrieve(question.trim(), languageCode);

    if (retrieval.belowThreshold) {
      const log = await AiQueryLog.create({
        question: question.trim(),
        languageCode,
        matchedCategories: null,
        confidenceScore: retrieval.confidence,
        aiCalled: false,
        answerPreview: null,
        sessionId: sessionId || null,
      });
      return res.json({
        aiConfigured: aiProviderConfigured,
        belowThreshold: true,
        answer: null,
        keyPoints: [],
        sources: [],
        islamicReference: null,
        bestFaqMatch: retrieval.bestFaqMatch,
        logId: log.id,
      });
    }

    const generated = await generateGroundedAnswer({
      question: question.trim(),
      contextText: retrieval.contextText,
      history: Array.isArray(history) ? history.slice(-6) : [],
      languageCode,
    });

    const islamicReference = generated ? pickIslamicReference(question.trim()) : null;

    const log = await AiQueryLog.create({
      question: question.trim(),
      languageCode,
      matchedCategories: retrieval.matchedCategories,
      confidenceScore: retrieval.confidence,
      aiCalled: Boolean(generated),
      answerPreview: generated?.answer?.slice(0, 500) || null,
      sessionId: sessionId || null,
    });

    res.json({
      aiConfigured: aiProviderConfigured,
      belowThreshold: false,
      answer: generated?.answer || null,
      keyPoints: generated?.keyPoints || [],
      sources: retrieval.sources,
      islamicReference,
      bestFaqMatch: retrieval.bestFaqMatch,
      logId: log.id,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const feedback = async (req, res) => {
  try {
    const { feedback: value, sessionId } = req.body;
    if (!["helpful", "unhelpful"].includes(value)) return res.status(400).json({ message: "Invalid feedback value." });

    const log = await AiQueryLog.findByPk(req.params.logId);
    if (!log) return res.status(404).json({ message: "Query not found." });
    if (log.sessionId && sessionId && log.sessionId !== sessionId) {
      return res.status(403).json({ message: "This feedback doesn't belong to your session." });
    }

    log.feedback = value;
    await log.save();
    res.json({ updated: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
