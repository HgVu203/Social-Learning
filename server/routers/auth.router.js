import express from "express";
import { AuthController } from "../controllers/auth.controller.js";
import protectedRouter from "../middleware/protectedRouter.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { authValidationSchema } from "../utils/validator/auth.validator.js";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { AuthService } from "../services/auth.service.js";
import User from "../models/user.model.js";
dotenv.config();

const router = express.Router();

// Rate limiters
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    error: "Too many login attempts, please try again later",
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    error: "Too many attempts, please try again later",
  },
});

// Public routes
router.post(
  "/signup",
  validateRequest(authValidationSchema.signup),
  AuthController.signup
);

router.post(
  "/login",
  loginLimiter,
  validateRequest(authValidationSchema.login),
  AuthController.login
);

router.post(
  "/forgot-password",
  authLimiter,
  validateRequest(authValidationSchema.forgotPassword),
  AuthController.forgotPassword
);

router.post(
  "/verify-email",
  authLimiter,
  validateRequest(authValidationSchema.verifyEmail),
  AuthController.verifyEmail
);

router.post(
  "/resend-verification",
  authLimiter,
  validateRequest(authValidationSchema.resendVerification),
  AuthController.resendVerification
);

router.post(
  "/verify-reset-code",
  authLimiter,
  validateRequest(authValidationSchema.verifyResetCode),
  AuthController.verifyResetCode
);

router.post(
  "/reset-password",
  authLimiter,
  validateRequest(authValidationSchema.resetPassword),
  AuthController.resetPassword
);

router.post("/refresh-token", AuthController.refreshToken);

// OAuth routes
router.get("/google", AuthController.googleLogin);
router.get("/google/callback", AuthController.googleCallback);
router.get("/facebook", AuthController.facebookLogin);
router.get("/facebook/callback", AuthController.facebookCallback);

// Special route for verifying social auth tokens
// This route doesn't use the regular protected middleware to allow temp tokens
router.get("/check", async (req, res) => {
  try {
    // Get token from header
    const token = AuthService.getTokenFromHeader(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Access token is required",
      });
    }

    // Verify token
    const { valid, decoded, error } = AuthService.verifyAccessToken(token);
    if (!valid) {
      return res.status(401).json({
        success: false,
        error: error || "Invalid access token",
      });
    }

    // Get user data
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "User not found",
      });
    }

    // Kiểm tra user.role để đảm bảo admin được xử lý đúng
    console.log(`Auth check for user ${user._id}, role: ${user.role}`);

    // Return user data and token
    return res.status(200).json({
      success: true,
      data: {
        token: token, // Gửi lại token để đảm bảo client luôn có token mới nhất
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          fullname: user.fullname,
          avatar: user.avatar,
          role: user.role,
          emailVerified: user.emailVerified || false,
          lastLogin: user.lastLogin,
        },
      },
    });
  } catch (error) {
    console.error("Error in /auth/check:", error);
    return res.status(500).json({
      success: false,
      error: "Authentication check failed",
    });
  }
});

// Protected routes
router.use(protectedRouter);

// Route for logout (requires authentication)
router.post("/logout", AuthController.logout);

router.post(
  "/change-password",
  validateRequest(authValidationSchema.changePassword),
  AuthController.changePassword
);

router.post(
  "/set-password/:id",
  validateRequest(authValidationSchema.setPassword),
  AuthController.setPassword
);

export default router;
