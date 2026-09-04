import User from "../models/User.js";
import { buildBioProfileContext, BIO_LANGUAGES } from "../utils/bioContext.js";
import { generateBio as generateBioWithAi } from "../services/aiProviderService.js";

// Mirrors userController.js's self-service generateBio, but builds the
// context from the TARGET member's own saved fields (never the admin's) —
// an admin writing a bio on someone's behalf sees exactly what that
// member's own "Generate Bio with AI" button would produce.
export const generateUserBio = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    const profileContext = await buildBioProfileContext(user);
    if (!profileContext.trim()) {
      return res.status(400).json({
        message: "This member hasn't added work experience, education, skills, or hobbies yet — the AI needs a few profile details to work with.",
      });
    }

    const languageCode = BIO_LANGUAGES.has(req.body.languageCode) ? req.body.languageCode : "en";
    const result = await generateBioWithAi({ profileContext, languageCode });
    if (!result) {
      return res.status(503).json({ message: "AI bio generation isn't available right now. Please try again later." });
    }

    res.json({ bio: result.bio });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
