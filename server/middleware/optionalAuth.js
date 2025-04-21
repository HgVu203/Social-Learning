import User from "../models/user.model.js";
import { AuthService } from "../services/auth.service.js";


const optionalAuth = async (req, res, next) => {
  try {
    const token = AuthService.getTokenFromHeader(req);

    if (!token) {
      req.user = null;
      return next();
    }

    const { valid, decoded, error } = AuthService.verifyAccessToken(token);

    if (!valid) {
      req.user = null;
      return next();
    }

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      req.user = null;
      return next();
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Optional auth middleware error:", error);
    req.user = null;
    next();
  }
};

export default optionalAuth;
