import jwt from "jsonwebtoken";

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

export const requireUser = (req, res, next) => {
  if (req.user?.type !== "user") {
    return res.status(403).json({ message: "Account access required." });
  }
  next();
};

export default auth;
