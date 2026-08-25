import jwt from "jsonwebtoken";
import User from "../models/User.js";

const auth = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user?.type === "user") {
    return res.status(403).json({ message: "Admin access required." });
  }
  next();
};

export const requireUser = async (req, res, next) => {
  if (req.user?.type !== "user") {
    return res.status(403).json({ message: "Account access required." });
  }
  // A password change bumps tokenVersion server-side; a token signed before
  // that no longer matches, so it's rejected here even though it hasn't expired.
  if (req.user.tv !== undefined) {
    const current = await User.findByPk(req.user.id, { attributes: ["tokenVersion"] });
    if (!current || current.tokenVersion !== req.user.tv) {
      return res.status(401).json({ message: "Your session has expired. Please sign in again." });
    }
  }
  next();
};

export default auth;
