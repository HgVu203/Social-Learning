import express from "express";
import { AuthController } from "../controllers/auth.controller.js";
import protectedRouter from "../middleware/protectedRouter.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { authValidationSchema } from "../utils/validator/auth.validator.js";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
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

// Protected routes
router.use(protectedRouter);

// Route để kiểm tra xác thực - trả về thông tin người dùng nếu đã xác thực
router.get("/check", (req, res) => {
  // Ensure we have the user from the auth middleware
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized access",
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      user: {
        _id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        fullname: req.user.fullname,
        avatar: req.user.avatar,
        role: req.user.role,
        emailVerified: req.user.emailVerified || false,
        lastLogin: req.user.lastLogin,
        // Add any other user fields needed by the client
      },
    },
  });
});

router.post("/logout", AuthController.logout);

router.post(
  "/set-password/:id",
  validateRequest(authValidationSchema.setPassword),
  AuthController.setPassword
);

export default router;
