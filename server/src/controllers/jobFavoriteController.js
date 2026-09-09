import Job from "../models/Job.js";
import JobFavorite from "../models/JobFavorite.js";

// Same public-visibility gate listPublic/getPublicOne already use — a job
// that's no longer active/moderated shouldn't accept or expose Save engagement.
async function findPublicJob(jobId) {
  return Job.findOne({ where: { id: jobId, status: "active", moderationStatus: "active" } });
}

export const getFavoriteStatus = async (req, res) => {
  try {
    const job = await findPublicJob(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found." });

    const favorite = await JobFavorite.findOne({ where: { jobId: req.params.id, userId: req.user.id } });
    res.json({ favorited: !!favorite });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addFavorite = async (req, res) => {
  try {
    const job = await findPublicJob(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found." });

    await JobFavorite.findOrCreate({ where: { jobId: req.params.id, userId: req.user.id } });
    res.json({ favorited: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const removeFavorite = async (req, res) => {
  try {
    await JobFavorite.destroy({ where: { jobId: req.params.id, userId: req.user.id } });
    res.json({ favorited: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
